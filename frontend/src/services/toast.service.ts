import toast, { ToastOptions } from 'react-hot-toast';

const defaultOptions: ToastOptions = {
    duration: 3000,
    position: 'top-right',
};

export const ToastService = {
    success: (message: string, options?: ToastOptions) => {
        toast.success(message, { ...defaultOptions, ...options });
    },
    
    error: (message: string, options?: ToastOptions) => {
        toast.error(message, { ...defaultOptions, ...options });
    },
    
    info: (message: string, options?: ToastOptions) => {
        toast(message, { ...defaultOptions, ...options });
    }
};
