/**
 * sockets/callSignaling.js
 *
 * Real-time signaling for the Flutter app's in-built WebRTC calling
 * (doctor <-> patient audio/video). This is purely a relay: it never
 * touches MongoDB except to look up a caller's display name, and it
 * never changes any REST behavior.
 *
 * The website keeps using ZegoCloud exactly as before — this module is
 * additive and only used by the Flutter app's socket_io_client. Nothing
 * here is reachable unless a client explicitly opens a Socket.IO
 * connection, so existing HTTP routes, the website, and Zego calling
 * are completely unaffected.
 *
 * Room key: the app reuses `appointment.zegoRoomId` (already returned
 * by GET /api/appointment/join/:id) as its WebRTC room id, so no
 * Appointment schema or route changes are needed either.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Doctor = require('../modal/Doctor');
const Patient = require('../modal/Patient');

/**
 * @param {import('http').Server} httpServer
 */
function initCallSignaling(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    // Same allow-list you already use for REST CORS; falls back to '*'
    // so the Flutter app (no browser origin) always works.
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : '*',
      credentials: true,
    },
  });

  // userId (Mongo _id as string) -> socket.id, so events can be relayed
  // to the right device. A user can only have one active socket here;
  // a fresh connection simply replaces the old mapping.
  const onlineUsers = new Map();

  io.use(async (socket, next) => {
    try {
      const { token, userId } = socket.handshake.auth || {};
      if (!token || !userId) return next(new Error('Missing token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (String(decoded.id) !== String(userId)) {
        return next(new Error('Token/userId mismatch'));
      }

      socket.userId = String(decoded.id);
      socket.userType = decoded.type; // 'doctor' | 'patient'
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    onlineUsers.set(socket.userId, socket.id);

    const relayTo = (toUserId, event, payload) => {
      const targetSocketId = onlineUsers.get(String(toUserId));
      if (targetSocketId) {
        io.to(targetSocketId).emit(event, payload);
      }
      // If the callee isn't connected right now, we simply don't relay —
      // the Flutter caller UI already times out gracefully ("no answer")
      // after 45s. (A push-notification fallback can be added here later.)
    };

    const getDisplayName = async () => {
      try {
        const Model = socket.userType === 'doctor' ? Doctor : Patient;
        const user = await Model.findById(socket.userId).select('name');
        return user?.name || 'Unknown';
      } catch {
        return 'Unknown';
      }
    };

    socket.on('call-user', async (data) => {
      // { toUserId, roomId, appointmentId, isVideoCall, offer }
      if (!data || !data.toUserId || !data.roomId || !data.offer) return;
      const fromUserName = await getDisplayName();
      relayTo(data.toUserId, 'incoming-call', {
        roomId: data.roomId,
        appointmentId: data.appointmentId,
        isVideoCall: !!data.isVideoCall,
        offer: data.offer,
        fromUserId: socket.userId,
        fromUserName,
      });
    });

    socket.on('answer-call', (data) => {
      // { toUserId, roomId, answer }
      if (!data || !data.toUserId || !data.roomId || !data.answer) return;
      relayTo(data.toUserId, 'call-answered', { roomId: data.roomId, answer: data.answer });
    });

    socket.on('reject-call', (data) => {
      // { toUserId, roomId }
      if (!data || !data.toUserId || !data.roomId) return;
      relayTo(data.toUserId, 'call-rejected', { roomId: data.roomId });
    });

    socket.on('cancel-call', (data) => {
      // { toUserId, roomId }
      if (!data || !data.toUserId || !data.roomId) return;
      relayTo(data.toUserId, 'call-cancelled', { roomId: data.roomId });
    });

    socket.on('ice-candidate', (data) => {
      // { toUserId, roomId, candidate }
      if (!data || !data.toUserId || !data.roomId || !data.candidate) return;
      relayTo(data.toUserId, 'ice-candidate', { roomId: data.roomId, candidate: data.candidate });
    });

    socket.on('end-call', (data) => {
      // { toUserId, roomId }
      if (!data || !data.toUserId || !data.roomId) return;
      relayTo(data.toUserId, 'call-ended', { roomId: data.roomId });
    });

    socket.on('disconnect', () => {
      if (onlineUsers.get(socket.userId) === socket.id) {
        onlineUsers.delete(socket.userId);
      }
    });
  });

  return io;
}

module.exports = { initCallSignaling };