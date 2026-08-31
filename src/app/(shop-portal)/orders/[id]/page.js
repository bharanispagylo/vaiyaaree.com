import { redirect } from 'next/navigation';

export default async function OrderRedirectPage({ params }) {
    const { id } = await params;
    redirect(`/profile/orders/${id}`);
}
