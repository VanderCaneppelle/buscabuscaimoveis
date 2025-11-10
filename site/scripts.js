document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav-toggle');
    const yearSpan = document.getElementById('current-year');

    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('is-open');
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('is-open');
            });
        });
    }

    const contactForm = document.querySelector('.contact__form');
    if (contactForm) {
        contactForm.addEventListener('submit', event => {
            event.preventDefault();
            alert('Obrigado! Entraremos em contato em breve.');
            contactForm.reset();
        });
    }
});

