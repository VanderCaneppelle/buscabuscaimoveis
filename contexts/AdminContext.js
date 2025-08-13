import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin deve ser usado dentro de AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAdminStatus = async () => {
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Erro ao verificar status de admin:', error);
                setIsAdmin(false);
            } else {
                setIsAdmin(data?.is_admin || false);
            }
        } catch (error) {
            console.error('Erro ao verificar admin:', error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAdminStatus();
    }, [user]);

    const refreshAdminStatus = () => {
        checkAdminStatus();
    };

    return (
        <AdminContext.Provider value={{
            isAdmin,
            loading,
            refreshAdminStatus
        }}>
            {children}
        </AdminContext.Provider>
    );
}; 