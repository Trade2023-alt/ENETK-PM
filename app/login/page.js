import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e8e8e8'
        }}>
            <LoginForm />
        </div>
    );
}
