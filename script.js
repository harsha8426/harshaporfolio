// ===== Particles =====
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas || typeof canvas.getContext !== 'function') return;

    let ctx;
    try {
        ctx = canvas.getContext('2d');
    } catch (_error) {
        return;
    }
    if (!ctx) return;

    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,212,255,${this.opacity})`;
            ctx.fill();
        }
    }

    function createParticles() {
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        particles = Array.from({ length: count }, () => new Particle());
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => { particle.update(); particle.draw(); });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0,212,255,${0.08 * (1 - distance / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(animateParticles);
        }
    }

    resizeCanvas();
    createParticles();
    window.addEventListener('resize', () => {
        resizeCanvas();
        createParticles();
    });
    animateParticles();
}

// ===== Cursor Glow =====
function initCursorGlow() {
    const cursorGlow = document.getElementById('cursorGlow');
    if (!cursorGlow) return;

    document.addEventListener('mousemove', (event) => {
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });
}

// ===== Navbar =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const links = document.querySelectorAll('.nav-link');

    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    links.forEach(link => {
        link.addEventListener('click', () => {
            if (navToggle) navToggle.classList.remove('active');
            if (navLinks) navLinks.classList.remove('active');
        });
    });

    const sections = document.querySelectorAll('.section, .hero');
    if (sections.length === 0 || links.length === 0) return;

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 100) current = section.getAttribute('id');
        });
        links.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    });
}

// ===== Typewriter =====
const TYPEWRITER_ROLES = Object.freeze([
    'QA Automation Engineer/SDET',
    'Senior Quality Assurance Analyst'
]);

function initTypewriter() {
    const typewriterEl = document.getElementById('typewriter');
    if (!typewriterEl) return;

    let roleIndex = 0;
    let characterIndex = 0;
    let isDeleting = false;

    function typewrite() {
        const currentRole = TYPEWRITER_ROLES[roleIndex];
        typewriterEl.textContent = isDeleting
            ? currentRole.substring(0, characterIndex--)
            : currentRole.substring(0, characterIndex++);

        let speed = isDeleting ? 30 : 60;
        if (!isDeleting && characterIndex === currentRole.length + 1) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && characterIndex < 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % TYPEWRITER_ROLES.length;
            speed = 500;
        }
        window.setTimeout(typewrite, speed);
    }

    typewrite();
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (animatedElements.length === 0) return;

    if (typeof IntersectionObserver !== 'function') {
        animatedElements.forEach(element => element.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animatedElements.forEach(element => observer.observe(element));
}

// ===== Tilt Effect =====
function initTiltEffect() {
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const rotateX = (y - rect.height / 2) / 15;
            const rotateY = (rect.width / 2 - x) / 15;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            const glow = card.querySelector('.skill-card-glow');
            if (glow) {
                glow.style.left = `${x - rect.width}px`;
                glow.style.top = `${y - rect.height}px`;
            }
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ===== Contact Form =====
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('.btn-submit');
        if (!button) return;

        button.innerHTML = '<span>Message Sent!</span> <i class="fas fa-check"></i>';
        button.style.background = 'linear-gradient(135deg, #00ff88, #00d4ff)';
        window.setTimeout(() => {
            button.innerHTML = '<span>Send Message</span> <i class="fas fa-paper-plane"></i>';
            button.style.background = '';
            form.reset();
        }, 3000);
    });
}

// ===== Smooth Scroll =====
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (event) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.getElementById(href.slice(1));
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ===== Indeterminate Checkbox (Test Lab) =====
function initTestLabCheckbox() {
    const initializeCheckbox = () => {
        const checkbox = document.getElementById('tl-indeterminate');
        if (checkbox) checkbox.indeterminate = true;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCheckbox, { once: true });
    } else {
        initializeCheckbox();
    }
}

initParticles();
initCursorGlow();
initNavbar();
initTypewriter();
initScrollAnimations();
initTiltEffect();
initContactForm();
initSmoothScroll();
initTestLabCheckbox();
