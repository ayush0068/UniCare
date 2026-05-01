require('dotenv').config();
require('./modal/Parchi');
const express = require('express')
const mongoose = require('mongoose')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')
const bodyParser = require('body-parser')
const response = require('./middleware/response');
require('./config/passport'); // Passport configuration
const passportLib = require('passport');
const { startReminderScheduler } = require('./utils/reminderScheduler');
const aiAssistantRoutes = require('./routes/aiAssistant');



const app = express();



//Helmet for security of express app (It is a security middleware for express apps that helps to secure the app by setting various HTTP headers)

app.use(helmet());


//Morgan for logging HTTP requests logger middleware(It is a middleware that logs HTTP requests and errors)

app.use(morgan('dev'))
app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean) || '*',

    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//used response
app.use(response);

//Initialze passport
app.use(passportLib.initialize());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));


startReminderScheduler();


app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/appointment', require('./routes/appointment'));
app.use('/api/payment', require('./routes/payment'))

app.use('/api/ai', aiAssistantRoutes);

app.use('/api/admin', require('./routes/admin'));


app.get('/health', (req, res) => res.ok({ time: new Date().toISOString() }, 'OK')
);





// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: err.stack
  });
});


console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));