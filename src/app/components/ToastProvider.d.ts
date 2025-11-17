import { type ReactNode } from "react";
type ToastVariant = "default" | "success" | "error";
interface ToastOptions {
    id?: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}
interface ToastContextValue {
    toast: (options: ToastOptions) => void;
    dismiss: (id: string) => void;
}
export declare const ToastProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useToast: () => ToastContextValue;
export {};
