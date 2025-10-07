// Main JavaScript file for The Magpie Treks & Tours website

// Global variables
let currentLanguage = 'en';
let translations = {};

// Initialize the website
document.addEventListener('DOMContentLoaded', function() {
    console.log('The Magpie Treks & Tours website loaded successfully!');
    
    // Initialize language system
    initializeLanguageSystem();
    
    // Initialize other components
    initializeComponents();
});

// Language System Functions
function initializeLanguageSystem() {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';
    currentLanguage = savedLanguage;
    
    // Set up language change listener
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = currentLanguage;
        languageSelect.addEventListener('change', handleLanguageChange);
    }
    
    // Apply current language
    if (currentLanguage !== 'en') {
        applyLanguage(currentLanguage);
    }
}

function handleLanguageChange(event) {
    const newLanguage = event.target.value;
    currentLanguage = newLanguage;
    
    // Save preference
    localStorage.setItem('selectedLanguage', newLanguage);
    
    // Apply language
    if (newLanguage === 'en') {
        resetToEnglish();
    } else {
        applyLanguage(newLanguage);
    }
}

function applyLanguage(language) {
    // This function can be extended with custom translations
    // For now, it uses Google Translate API
    if (typeof google !== 'undefined' && google.translate) {
        const translateElement = google.translate.TranslateElement.getInstance();
        if (translateElement) {
            translateElement.translatePage(language);
        }
    } else {
        // Load Google Translate if not available
        loadGoogleTranslate(language);
    }
}

function resetToEnglish() {
    if (typeof google !== 'undefined' && google.translate) {
        const translateElement = google.translate.TranslateElement.getInstance();
        if (translateElement) {
            translateElement.translatePage('en');
        }
    }
}

function loadGoogleTranslate(targetLanguage) {
    if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.head.appendChild(script);
        
        window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'ar,zh,fr,de,it,ms,ru,es',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
            }, 'google_translate_element');
            
            // Trigger translation after initialization
            setTimeout(() => {
                const translateElement = google.translate.TranslateElement.getInstance();
                if (translateElement) {
                    translateElement.translatePage(targetLanguage);
                }
            }, 1000);
        };
    }
}

// Component Initialization
function initializeComponents() {
    // Initialize smooth scrolling for anchor links
    initializeSmoothScrolling();
    
    // Initialize scroll effects
    initializeScrollEffects();
    
    // Initialize form validations
    initializeFormValidations();
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Scroll Effects
function initializeScrollEffects() {
    // Parallax effect for hero section
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            heroSection.style.transform = `translateY(${rate}px)`;
        });
    }
    
    // Fade in elements on scroll
    const fadeElements = document.querySelectorAll('.fade-in');
    if (fadeElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        });
        
        fadeElements.forEach(element => {
            observer.observe(element);
        });
    }
}

// Form Validations
function initializeFormValidations() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ff4757';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '5px';
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#ff4757';
}

function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '';
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export functions for global use
window.MagpieWebsite = {
    changeLanguage: applyLanguage,
    resetLanguage: resetToEnglish,
    getCurrentLanguage: () => currentLanguage
};


// CARDS SECTION 1
  // Intersection observer for cards & stats, updated for 2s animation durations
  (function(){
    const cardOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const cards = document.querySelectorAll('.service-card');

    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // add slight stagger between cards for nicer flow
          const el = entry.target;
          const delayMap = { left: 0, up: 120, right: 240 };
          const animType = el.dataset.anim || el.classList.contains('anim-left') ? 'left' : (el.classList.contains('anim-up') ? 'up' : 'right');
          setTimeout(() => {
            el.classList.add('in-view');
          }, delayMap[animType] || 0);
          cardObserver.unobserve(el);
        }
      });
    }, cardOptions);

    cards.forEach(c => cardObserver.observe(c));

    // Stats: reveal and count-up with 2s durations
    const statsWrap = document.getElementById('statsWrap');
    const statItems = document.querySelectorAll('[data-animate-stat]');
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          // stagger reveal
          statItems.forEach((el, idx) => {
            setTimeout(() => el.classList.add('in-view'), idx * 140);
          });
          // start counting
          startCounting();
          statObserver.unobserve(statsWrap);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });

    statObserver.observe(statsWrap);

    // Count-up function - 2s duration for each
    function animateValue(elem, start, end, duration, callback) {
      const startTime = performance.now();
      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = progress; // linear easing for counter - feels natural for big numbers
        const value = Math.floor(eased * (end - start) + start);
        // show with thousands separator while counting
        elem.textContent = value.toLocaleString();
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          if (callback) callback();
        }
      }
      requestAnimationFrame(step);
    }

    function formatAfterFinish(el, target) {
      // show compact like 2k+ 6k+ or raw if <1000
      if (target >= 1000) {
        const k = Math.round(target / 1000);
        el.textContent = k + 'k+';
      } else {
        el.textContent = target + (target >= 0 ? '+' : '');
      }
    }

    function startCounting() {
      const statEls = [
        { el: document.getElementById('stat1'), target: parseInt(document.getElementById('stat1').dataset.target, 10), dur: 2000 },
        { el: document.getElementById('stat2'), target: parseInt(document.getElementById('stat2').dataset.target, 10), dur: 2000 },
        { el: document.getElementById('stat3'), target: parseInt(document.getElementById('stat3').dataset.target, 10), dur: 2000 },
        { el: document.getElementById('stat4'), target: parseInt(document.getElementById('stat4').dataset.target, 10), dur: 2000 }
      ];

      statEls.forEach((s, i) => {
        animateValue(s.el, 0, s.target, s.dur, () => formatAfterFinish(s.el, s.target));
      });
    }
  })();

  (function(){
    const DATA = [
      {
        text: "The Magpie Treks & Tours made my trip unforgettable. I felt safe, inspired, and deeply connected to the landscape. I would recommend MTT to anyone with a thirst for genuine adventure!",
        name: "Sarah K.",
        loc: "United States",
        avatar: "https://randomuser.me/api/portraits/women/68.jpg"
      },
      {
        text: "The attention to detail and the professionalism of the guides made our experience remarkable. MTT took care of everything — we only had to enjoy the view.",
        name: "Ahmed R.",
        loc: "United Kingdom",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg"
      },
      {
        text: "Professional guides, amazing routes and excellent food. The logistics were seamless — best trip I’ve done in years.",
        name: "Lina M.",
        loc: "Canada",
        avatar: "https://randomuser.me/api/portraits/women/25.jpg"
      },
      {
        text: "If you want real, off-the-beaten-path adventure — this is it. Highly recommended for serious trekkers.",
        name: "Mateo S.",
        loc: "Spain",
        avatar: "https://randomuser.me/api/portraits/men/11.jpg"
      }
    ];
  
    const cardsWrap = document.getElementById('tsCards');
    const dotsWrap = document.getElementById('tsDots');
  
    // Render cards
    DATA.forEach((t) => {
      const card = document.createElement('article');
      card.className = 'ts-card';
      card.setAttribute('role','group');
      card.setAttribute('aria-roledescription','testimonial');
      card.setAttribute('aria-label', `${t.name}, ${t.loc}`);
      card.tabIndex = -1;
      card.innerHTML = `
        <p class="ts-text">${t.text}</p>
        <div class="ts-author">
          <img src="${t.avatar}" alt="${t.name}">
          <div>
            <strong>${t.name}</strong><br/><small>${t.loc}</small>
          </div>
        </div>
        <div class="ts-quote" aria-hidden="true">“”</div>
      `;
      cardsWrap.appendChild(card);
    });
  
    // decorative paper layers
    for (let i=0;i<3;i++){
      const p = document.createElement('div');
      p.className = 'ts-paper';
      p.style.bottom = (-18 - (i*6)) + 'px';
      p.style.opacity = (0.12 - i*0.03);
      cardsWrap.appendChild(p);
    }
  
    const cards = Array.from(cardsWrap.querySelectorAll('.ts-card'));
    let current = 0;
  
    // Create dots and attach handlers
    DATA.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'ts-dot';
      btn.setAttribute('aria-label', 'Go to testimonial ' + (i+1));
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => goTo(i));
      // allow tap area larger on mobile by adding padding via css
      dotsWrap.appendChild(btn);
    });
    const dots = Array.from(dotsWrap.children);
  
    function render() {
      cards.forEach((c,i) => {
        c.classList.remove('front','back','next');
        if (i === current) c.classList.add('front');
        else if (i === (current - 1 + cards.length) % cards.length) c.classList.add('back');
        else if (i === (current + 1) % cards.length) c.classList.add('next');
        else {
          c.style.opacity = '0';
          c.style.transform = 'translateX(-50%) translateY(34px) scale(.98)';
          c.style.zIndex = 0;
        }
        // clear inline for visible ones
        if (c.classList.contains('front') || c.classList.contains('next') || c.classList.contains('back')) {
          c.style.opacity = '';
          c.style.transform = '';
          c.style.zIndex = '';
        }
      });
  
      dots.forEach((d, idx) => {
        d.classList.toggle('active', idx === current);
        d.setAttribute('aria-pressed', idx === current ? 'true' : 'false');
      });
    }
  
    function goTo(i) {
      current = ((i % cards.length) + cards.length) % cards.length;
      render();
      // focus front card for screen-reader users
      const front = cards[current];
      if (front) front.focus({preventScroll:true});
    }
  
    // keyboard nav (left/right)
    const root = document.getElementById('testimonials-section');
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { goTo(current - 1); }
      if (e.key === 'ArrowRight') { goTo(current + 1); }
    });
  
    // TOUCH / SWIPE support for mobile
    let startX = 0, startY = 0, isMoving = false;
    const threshold = 40; // px
    const stage = document.querySelector('#testimonials-section .ts-stage');
  
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isMoving = true;
      }
    }, {passive: true});
  
    stage.addEventListener('touchmove', (e) => {
      // prevent vertical scroll lock; we only track horizontal distance
      if (!isMoving || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      // if vertical move is bigger, treat as scroll
      if (Math.abs(dy) > Math.abs(dx)) {
        isMoving = false;
        return;
      }
      // prevent default horizontal page scroll on significant movement
      if (Math.abs(dx) > 8) e.preventDefault();
    }, {passive:false});
  
    stage.addEventListener('touchend', (e) => {
      if (!isMoving) return;
      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
      const dx = endX - startX;
      if (Math.abs(dx) > threshold) {
        if (dx > 0) goTo(current - 1); // swipe right -> prev
        else goTo(current + 1);        // swipe left -> next
      }
      isMoving = false;
    });
  
    // init
    render();
  
    // ensure focusable container for keyboard users
    cardsWrap.tabIndex = -1;
  })();