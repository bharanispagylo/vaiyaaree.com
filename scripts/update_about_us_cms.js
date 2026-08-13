const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateAboutUs() {
    const htmlContent = `<div class="about-us-grid">
    <div class="about-us-text">
        <p class="brand-tagline">A Vaiyaaree company</p>
        <p>Vaiyaaree sarees aims at offering a fantastic blend of style, fashion, colours and quality. Our journey began with a simple idea – to create a platform where saree lovers could find the most exquisite and authentic collection of sarees from all over India.</p>
        <p>Started as an Instagram-based business with South cotton printed sarees, we have been committed to promoting traditional Indian textiles and craftsmanship.</p>
        <p>Vaiyaaree sarees grew as a well trusted brand, well-received by its 100K+ Instagram followers, stands a testimony.</p>
        <p>We are passionate about providing our customers with a seamless shopping experience. Our team is always ready to assist you with any queries or concerns you may have. We pride ourselves on our customer-centric approach and our commitment to making every customer feel special. Our goal is to be your go-to destination for all your saree needs.</p>
        <p>Each print has a story to tell and each product is created with lot of love.</p>
        <div class="sign-off">
            <p>Yours</p>
            <p class="sign-off-author">Vaiyaaree Sarees</p>
        </div>
    </div>
    <div class="about-us-media">
        <img src="/images/about-us-saree.jpg" alt="Vaiyaaree About Us Saree" class="about-image" />
    </div>
</div>`;

    const { error } = await supabase
        .from('cms_pages')
        .update({
            content: htmlContent,
            title: 'About Us',
            updated_at: new Date().toISOString()
        })
        .eq('slug', 'about-us');

    if (error) {
        console.error('Error updating CMS page:', error.message);
    } else {
        console.log('Successfully updated About Us page in Supabase database!');
    }
}

updateAboutUs();
