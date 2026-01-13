import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)'
        }}>
            <LoginForm />
        </div>
    );
}
