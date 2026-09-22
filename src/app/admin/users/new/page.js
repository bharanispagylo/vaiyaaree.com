'use client';

import { useRouter } from 'next/navigation';
import UserEditPage from '../components/UserEditPage';

export default function CreateUserPage() {
    const router = useRouter();

    return (
        <UserEditPage
            isNew={true}
            onBack={() => router.push('/admin/users')}
            onSaved={() => router.push('/admin/users')}
        />
    );
}
