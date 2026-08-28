'use client';

import { useParams } from 'next/navigation';
import ProductFormContainer from '../components/ProductFormContainer';

export default function EditProductPage() {
    const params = useParams();
    const id = params?.id;

    return <ProductFormContainer productId={id} />;
}
