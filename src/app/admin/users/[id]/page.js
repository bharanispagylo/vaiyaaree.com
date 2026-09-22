'use client';

import { useParams, useRouter } from 'next/navigation';
import UserEditPage from '../components/UserEditPage';

export default function EditUserSubPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    return (
        <UserEditPage
            userId={id}
            isNew={false}
            onBack={() => router.push('/admin/users')}
            onSaved={() => router.push('/admin/users')}
        />
    );
}
