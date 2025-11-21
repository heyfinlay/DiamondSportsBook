import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@lib/auth/SessionProvider';
import { supabase } from '@lib/supabaseClient';
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [icNumber, setIcNumber] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const { signIn, signUp } = useSession();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);
        try {
            if (isSignUp) {
                const trimmedUsername = username.trim();
                const trimmedIc = icNumber.trim();
                if (!trimmedUsername || !trimmedIc) {
                    setError('Username and IC number are required.');
                    return;
                }
                const { data: existingUsername, error: usernameCheckError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', trimmedUsername)
                    .maybeSingle();
                if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
                    setError('Unable to verify username availability.');
                    return;
                }
                if (existingUsername) {
                    setError('That username is already taken. Choose another one.');
                    return;
                }
                const { error } = await signUp({
                    email: email.trim(),
                    password,
                    username: trimmedUsername,
                    icNumber: trimmedIc
                });
                if (error) {
                    setError(error.message);
                }
                else {
                    setMessage('Check your email for a confirmation link. Once confirmed, you can sign in.');
                    setIsSignUp(false);
                    setPassword('');
                    setUsername('');
                    setIcNumber('');
                }
            }
            else {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message);
                }
                else {
                    // Successful login - redirect
                    navigate(from, { replace: true });
                }
            }
        }
        catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", children: _jsxs("div", { className: "max-w-md w-full space-y-8 p-8 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-white", children: "Diamond Sporting Book" }), _jsx("p", { className: "mt-2 text-center text-sm text-slate-400", children: isSignUp ? 'Create your account' : 'Sign in to your account' })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [error && (_jsx("div", { className: "rounded-md bg-red-900/50 border border-red-700 p-4", children: _jsx("p", { className: "text-sm text-red-200", children: error }) })), message && (_jsx("div", { className: "rounded-md bg-green-900/50 border border-green-700 p-4", children: _jsx("p", { className: "text-sm text-green-200", children: message }) })), _jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "Email address" }), _jsx("input", { id: "email-address", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "appearance-none rounded-t-md relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm", placeholder: "Email address" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: isSignUp ? 'new-password' : 'current-password', required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "appearance-none rounded-b-md relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm", placeholder: "Password", minLength: 6 })] })] }), isSignUp && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "username", className: "sr-only", children: "Username" }), _jsx("input", { id: "username", name: "username", type: "text", required: isSignUp, value: username, onChange: (e) => setUsername(e.target.value), className: "relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "Username" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "ic-number", className: "sr-only", children: "IC Number" }), _jsx("input", { id: "ic-number", name: "ic-number", type: "text", required: isSignUp, value: icNumber, onChange: (e) => setIcNumber(e.target.value), className: "relative block w-full rounded-md border border-slate-600 px-3 py-2 text-white placeholder-slate-400 bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "IC Number" })] })] })), _jsx("div", { children: _jsx("button", { type: "submit", disabled: loading, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: loading ? 'Processing...' : isSignUp ? 'Sign up' : 'Sign in' }) }), _jsx("div", { className: "text-center", children: _jsx("button", { type: "button", onClick: () => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setMessage(null);
                                    setUsername('');
                                    setIcNumber('');
                                }, className: "text-sm text-blue-400 hover:text-blue-300 transition-colors", children: isSignUp
                                    ? 'Already have an account? Sign in'
                                    : "Don't have an account? Sign up" }) })] }), _jsx("div", { className: "mt-6 text-center", children: _jsx("p", { className: "text-xs text-slate-500", children: "Race Control \u2022 Live Timing \u2022 Betting Platform" }) })] }) }));
}
