document.addEventListener('DOMContentLoaded', () => {

    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');

            // Toggle icon
            const icon = menuBtn.querySelector('i');
            if (mobileMenu.classList.contains('active')) {
                icon.classList.replace('ph-list', 'ph-x');
            } else {
                icon.classList.replace('ph-x', 'ph-list');
            }
        });

        // Close menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                const icon = menuBtn.querySelector('i');
                icon.classList.replace('ph-x', 'ph-list');
            });
        });
    }

    // Lead Form Submission Simulation
    const form = document.getElementById('leadForm');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;

            // Simulate loading state
            btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            // Simulate server request
            setTimeout(() => {
                btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> Pedido Enviado!';
                btn.style.backgroundColor = 'var(--accent)';

                // Show success alert
                alert('Obrigado pelo seu interesse!\n\nRecebemos os seus dados e a nossa equipa entrará em contacto em breve para agendar a demonstração do piloto.');

                form.reset();

                // Reset button after a delay
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.backgroundColor = '';
                }, 3000);

            }, 1500);
        });
    }
});
