import PolicyPage from '@/components/PolicyPage';

export default async function CMSDynamicPage({ params }) {
    const { slug } = await params;
    return <PolicyPage slug={slug} />;
}
