import { User } from '@/lib/types';
import { getWithAuth, postWithoutAuth, putWithAuth } from '@/service/httpService';
import {create} from 'zustand';
import { persist } from 'zustand/middleware';


interface OtpResult {
  requiresOtp: true;
  tempToken?: string;
  email?: string;
  sentTo: { email: string; phone: string | null };
}

interface AuthState {
    user : User | null;
    token : string | null;
    loading : boolean;
    error : string | null;
    isAuthenticated : boolean;

    //Actions
    setUser : (user: User, token: string) => void
    clearError : () => void;
    logout : () => void;

    //Api Actions
    loginDoctor : (email: string, password: string) => Promise<OtpResult | void>;
    loginPatient : (email: string, password: string) => Promise<OtpResult | void>;
    loginAsGuest : () => Promise<void>;
    registerDoctor : (data: any) => Promise<OtpResult | void>;
    registerPatient : (data: any) => Promise<OtpResult | void>;
    fetchProfile : () => Promise<User | null>;
    updateProfile : (data: any) => Promise<void>;
}


export const userAuthStore = create<AuthState>()(
    persist((set, get) => ({
        user: null,
        token: null,
        loading: false,
        error: null,
        isAuthenticated: false,

        setUser: (user, token) => {
            set({
                user, token, isAuthenticated: true, error: null
            });
            localStorage.setItem('token', token);
        },
        clearError: () => set({ error: null }),

        logout: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('auth-storage');
            set({
                user: null, token: null, isAuthenticated: false, error: null
            })
        },

        loginDoctor: async (email, password) => {
            set({ loading: true, error: null });
            try {
                const response = await postWithoutAuth("/auth/doctor/login", { email, password });
                if (response.data?.requiresOtp) {
                    // OTP mode — return pending data
                    return response.data as OtpResult;
                }
                // Password mode — direct JWT, set user immediately
                get().setUser(response.data.user, response.data.token);
            } catch (error: any) {
                set({ error: error.message });
                throw error;
            } finally {
                set({ loading: false });
            }
        },

        loginPatient: async (email, password) => {
            set({ loading: true, error: null });
            try {
                const response = await postWithoutAuth("/auth/patient/login", { email, password });
                if (response.data?.requiresOtp) {
                    // OTP mode — return pending data
                    return response.data as OtpResult;
                }
                // Password mode — direct JWT, set user immediately
                get().setUser(response.data.user, response.data.token);
            } catch (error: any) {
                set({ error: error.message });
                throw error;
            } finally {
                set({ loading: false });
            }
        },

        loginAsGuest: async () => {
            set({ loading: true, error: null });
            try {
                const response = await postWithoutAuth("/auth/guest/login", {});
                get().setUser(response.data.user, response.data.token);
            } catch (error: any) {
                set({ error: error.message });
                throw error;
            } finally {
                set({ loading: false });
            }
        },

        registerDoctor: async (data) => {
            set({ loading: true, error: null });
            try {
                const response = await postWithoutAuth("/auth/doctor/register", data);
                // OTP required — return pending data, don't set auth yet
                if (response.data?.requiresOtp) {
                    return { ...response.data, email: data.email } as OtpResult;
                }
                get().setUser(response.data.user, response.data.token);
            } catch (error: any) {
                set({ error: error.message })
                throw error;
            } finally {
                set({ loading: false })
            }
        },

        registerPatient: async (data) => {
            set({ loading: true, error: null });
            try {
                const response = await postWithoutAuth("/auth/patient/register", data);
                // OTP required — return pending data, don't set auth yet
                if (response.data?.requiresOtp) {
                    return { ...response.data, email: data.email } as OtpResult;
                }
                get().setUser(response.data.user, response.data.token);
            } catch (error: any) {
                set({ error: error.message })
                throw error;
            } finally {
                set({ loading: false })
            }
        },

        fetchProfile: async (): Promise<User | null> => {
            set({ loading: true, error: null });
            try {
                const { user } = get();
                if (!user) throw new Error("No User Found");
                // Guest users have no profile endpoint
                if (user.isGuest) return user;
                const endPoint = user.type === 'doctor' ? "/doctor/me" : "/patient/me";
                const response = await getWithAuth(endPoint)
                set({ user: { ...user, ...response.data } })
                return response.data;
            } catch (error: any) {
                set({ error: error.message });
                return null;
            } finally {
                set({ loading: false });
            }
        },

        updateProfile: async (data) => {
            set({ loading: true, error: null });
            try {
                const { user } = get();
                if (!user) throw new Error("No user found");
                if (user.isGuest) throw new Error("Guest users cannot update profile. Please create an account.");
                const endPoint = user.type === 'doctor' ? "/doctor/onboarding/update" : "/patient/onboarding/update";
                const response = await putWithAuth(endPoint, data);
                set({ user: { ...user, ...response.data } });
            } catch (error: any) {
                set({ error: error.message });
                throw error;
            } finally {
                set({ loading: false })
            }
        }
    }), {
        name: "auth-storage",
        partialize: (state) => ({
            user: state.user,
            token: state.token,
            isAuthenticated: state.isAuthenticated
        })
    })
)