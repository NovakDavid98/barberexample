/**
 * NOIR Barbershop — Reservation App
 *
 * Vanilla JS — no frameworks.
 * State management, calendar generation, form validation,
 * keyboard navigation, accessibility.
 */

(function () {
    'use strict';

    // ================================================================
    // TEST DATA
    // ================================================================

    const SERVICES = [
        { id: 1, name: 'Pánský střih',           icon: '✂️',  duration: 30, price: 450 },
        { id: 2, name: 'Úprava vousů',           icon: '🪒',  duration: 20, price: 300 },
        { id: 3, name: 'Střih + vousy',           icon: '💈',  duration: 45, price: 650 },
        { id: 4, name: 'Dětský střih',            icon: '👦',  duration: 25, price: 350 },
        { id: 5, name: 'Úprava obočí',            icon: '✨',  duration: 10, price: 150 },
        { id: 6, name: 'Head shave',              icon: '🪮',  duration: 20, price: 400 },
    ];

    const BARBERS = [
        { id: 1, name: 'Jakub Černý',   initials: 'JČ', services: [1, 2, 3, 4, 5, 6] },
        { id: 2, name: 'Martin Král',   initials: 'MK', services: [1, 2, 3, 6] },
        { id: 3, name: 'Tomáš Dvořák',  initials: 'TD', services: [1, 3, 4, 5] },
    ];

    // Generate time slots — 9:00 to 18:00 in 30min increments
    function generateTimeSlots(date) {
        const slots = [];
        const dayOfWeek = date.getDay();

        // Weekend — closed on Sunday
        if (dayOfWeek === 0) return [];

        // Saturday — shorter hours
        const endHour = dayOfWeek === 6 ? 14 : 18;

        for (let h = 9; h < endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                // Simulate some slots being taken (deterministic based on date+time)
                const hash = (date.getDate() * 7 + h * 13 + m) % 5;
                slots.push({ time, available: hash !== 0 });
            }
        }
        return slots;
    }

    // ================================================================
    // STATE
    // ================================================================

    const state = {
        currentStep: 1,
        selectedService: null,
        selectedBarber: null,
        selectedDate: null,
        selectedTime: null,
        calendarMonth: new Date().getMonth(),
        calendarYear: new Date().getFullYear(),
    };

    // ================================================================
    // DOM REFERENCES
    // ================================================================

    const dom = {
        steps: {
            1: document.getElementById('step-1'),
            2: document.getElementById('step-2'),
            3: document.getElementById('step-3'),
            success: document.getElementById('step-success'),
        },
        progressSteps: document.querySelectorAll('.progress__step'),
        servicesGrid: document.getElementById('services-grid'),
        barbersGrid: document.getElementById('barbers-grid'),
        btnToStep2: document.getElementById('btn-to-step-2'),
        btnToStep3: document.getElementById('btn-to-step-3'),
        btnBack1: document.getElementById('btn-back-1'),
        btnBack2: document.getElementById('btn-back-2'),
        btnRestart: document.getElementById('btn-restart'),
        calPrev: document.getElementById('cal-prev'),
        calNext: document.getElementById('cal-next'),
        calMonthLabel: document.getElementById('cal-month-label'),
        calDays: document.getElementById('cal-days'),
        timeSlots: document.getElementById('time-slots'),
        bookingSummary: document.getElementById('booking-summary'),
        successDetails: document.getElementById('success-details'),
        contactForm: document.getElementById('contact-form'),
        inputName: document.getElementById('input-name'),
        inputEmail: document.getElementById('input-email'),
        inputPhone: document.getElementById('input-phone'),
    };

    // ================================================================
    // STEP NAVIGATION
    // ================================================================

    function goToStep(step) {
        // Hide all
        Object.values(dom.steps).forEach(s => {
            s.hidden = true;
            s.classList.remove('step--active');
        });

        // Show target
        const key = step === 'success' ? 'success' : step;
        dom.steps[key].hidden = false;
        dom.steps[key].classList.add('step--active');

        // Update progress indicators
        dom.progressSteps.forEach(el => {
            const s = parseInt(el.dataset.step, 10);
            el.classList.remove('progress__step--active', 'progress__step--done');
            el.removeAttribute('aria-current');

            if (step === 'success') {
                el.classList.add('progress__step--done');
            } else if (s === step) {
                el.classList.add('progress__step--active');
                el.setAttribute('aria-current', 'step');
            } else if (s < step) {
                el.classList.add('progress__step--done');
            }
        });

        state.currentStep = step;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Populate step-specific content
        if (step === 2) {
            renderCalendar();
        }
        if (step === 3) {
            renderSummary(dom.bookingSummary);
        }
        if (step === 'success') {
            renderSummary(dom.successDetails);
        }
    }

    // ================================================================
    // STEP 1: SERVICES & BARBERS
    // ================================================================

    function renderServices() {
        dom.servicesGrid.innerHTML = SERVICES.map(s => `
            <div class="card" role="option" tabindex="0" data-service-id="${s.id}"
                 aria-selected="false" aria-label="${s.name} — ${s.duration} minut, ${s.price} Kč">
                <div class="card__icon" aria-hidden="true">${s.icon}</div>
                <div class="card__info">
                    <div class="card__name">${s.name}</div>
                    <div class="card__detail">${s.duration} min</div>
                </div>
                <div class="card__price">${s.price} Kč</div>
                <div class="card__check" aria-hidden="true">✓</div>
            </div>
        `).join('');

        dom.servicesGrid.addEventListener('click', e => {
            const card = e.target.closest('.card');
            if (!card) return;
            selectService(parseInt(card.dataset.serviceId, 10));
        });

        dom.servicesGrid.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const card = e.target.closest('.card');
                if (card) selectService(parseInt(card.dataset.serviceId, 10));
            }
        });
    }

    function selectService(id) {
        state.selectedService = SERVICES.find(s => s.id === id);

        dom.servicesGrid.querySelectorAll('.card').forEach(c => {
            const selected = parseInt(c.dataset.serviceId, 10) === id;
            c.classList.toggle('card--selected', selected);
            c.setAttribute('aria-selected', selected ? 'true' : 'false');
        });

        // Filter barbers by service
        renderBarbers();
        updateStep1Button();
    }

    function renderBarbers() {
        const filtered = state.selectedService
            ? BARBERS.filter(b => b.services.includes(state.selectedService.id))
            : BARBERS;

        dom.barbersGrid.innerHTML = filtered.map(b => `
            <div class="card card--barber" role="option" tabindex="0" data-barber-id="${b.id}"
                 aria-selected="false" aria-label="Kadeřník ${b.name}">
                <div class="card__icon" aria-hidden="true">${b.initials}</div>
                <div class="card__info">
                    <div class="card__name">${b.name}</div>
                </div>
                <div class="card__check" aria-hidden="true">✓</div>
            </div>
        `).join('');

        dom.barbersGrid.addEventListener('click', e => {
            const card = e.target.closest('.card');
            if (!card) return;
            selectBarber(parseInt(card.dataset.barberId, 10));
        });

        dom.barbersGrid.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const card = e.target.closest('.card');
                if (card) selectBarber(parseInt(card.dataset.barberId, 10));
            }
        });

        // Reset barber selection if current barber not available for new service
        if (state.selectedBarber && !filtered.find(b => b.id === state.selectedBarber.id)) {
            state.selectedBarber = null;
        } else if (state.selectedBarber) {
            // Re-select visually
            const card = dom.barbersGrid.querySelector(`[data-barber-id="${state.selectedBarber.id}"]`);
            if (card) {
                card.classList.add('card--selected');
                card.setAttribute('aria-selected', 'true');
            }
        }

        updateStep1Button();
    }

    function selectBarber(id) {
        state.selectedBarber = BARBERS.find(b => b.id === id);

        dom.barbersGrid.querySelectorAll('.card').forEach(c => {
            const selected = parseInt(c.dataset.barberId, 10) === id;
            c.classList.toggle('card--selected', selected);
            c.setAttribute('aria-selected', selected ? 'true' : 'false');
        });

        updateStep1Button();
    }

    function updateStep1Button() {
        dom.btnToStep2.disabled = !(state.selectedService && state.selectedBarber);
    }

    // ================================================================
    // STEP 2: CALENDAR & TIME SLOTS
    // ================================================================

    const MONTH_NAMES = [
        'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
        'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
    ];

    function renderCalendar() {
        const year = state.calendarYear;
        const month = state.calendarMonth;

        dom.calMonthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '';

        // Empty cells before first day
        for (let i = 0; i < startDay; i++) {
            html += '<button class="calendar__day calendar__day--empty" disabled tabindex="-1" aria-hidden="true"></button>';
        }

        // Days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            const isPast = date < today;
            const isSunday = date.getDay() === 0;
            const isDisabled = isPast || isSunday;
            const isToday = date.getTime() === today.getTime();
            const isSelected = state.selectedDate &&
                date.getDate() === state.selectedDate.getDate() &&
                date.getMonth() === state.selectedDate.getMonth() &&
                date.getFullYear() === state.selectedDate.getFullYear();

            const classes = ['calendar__day'];
            if (isToday) classes.push('calendar__day--today');
            if (isSelected) classes.push('calendar__day--selected');

            const label = `${d}. ${MONTH_NAMES[month]} ${year}${isSunday ? ' — zavřeno' : ''}${isToday ? ' — dnes' : ''}`;

            html += `<button class="${classes.join(' ')}" ${isDisabled ? 'disabled' : ''}
                        data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}"
                        aria-label="${label}"
                        role="gridcell">${d}</button>`;
        }

        dom.calDays.innerHTML = html;

        // Event delegation for day clicks
        dom.calDays.onclick = e => {
            const btn = e.target.closest('.calendar__day');
            if (!btn || btn.disabled || btn.classList.contains('calendar__day--empty')) return;

            const [y, m, d] = btn.dataset.date.split('-').map(Number);
            selectDate(new Date(y, m - 1, d));
        };
    }

    function selectDate(date) {
        state.selectedDate = date;
        state.selectedTime = null;

        renderCalendar();
        renderTimeSlots(date);
        updateStep2Button();
    }

    function renderTimeSlots(date) {
        const slots = generateTimeSlots(date);

        if (slots.length === 0) {
            dom.timeSlots.innerHTML = '<p class="time-slots__placeholder">V tento den je zavřeno.</p>';
            return;
        }

        dom.timeSlots.innerHTML = slots.map(s => `
            <button class="time-slot" role="option"
                    ${!s.available ? 'disabled' : ''}
                    aria-selected="false"
                    aria-label="${s.time}${!s.available ? ' — obsazeno' : ''}"
                    data-time="${s.time}">
                ${s.time}
            </button>
        `).join('');

        dom.timeSlots.onclick = e => {
            const btn = e.target.closest('.time-slot');
            if (!btn || btn.disabled) return;
            selectTime(btn.dataset.time);
        };
    }

    function selectTime(time) {
        state.selectedTime = time;

        dom.timeSlots.querySelectorAll('.time-slot').forEach(btn => {
            const selected = btn.dataset.time === time;
            btn.classList.toggle('time-slot--selected', selected);
            btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        });

        updateStep2Button();
    }

    function updateStep2Button() {
        dom.btnToStep3.disabled = !(state.selectedDate && state.selectedTime);
    }

    // ================================================================
    // STEP 3: SUMMARY & FORM
    // ================================================================

    function renderSummary(container) {
        const dateStr = state.selectedDate
            ? `${state.selectedDate.getDate()}. ${MONTH_NAMES[state.selectedDate.getMonth()]} ${state.selectedDate.getFullYear()}`
            : '—';

        container.innerHTML = `
            <div class="summary__row">
                <span class="summary__label">Služba</span>
                <span class="summary__value">${state.selectedService?.name ?? '—'}</span>
            </div>
            <div class="summary__row">
                <span class="summary__label">Kadeřník</span>
                <span class="summary__value">${state.selectedBarber?.name ?? '—'}</span>
            </div>
            <div class="summary__row">
                <span class="summary__label">Datum</span>
                <span class="summary__value">${dateStr}</span>
            </div>
            <div class="summary__row">
                <span class="summary__label">Čas</span>
                <span class="summary__value">${state.selectedTime ?? '—'}</span>
            </div>
            <div class="summary__row">
                <span class="summary__label">Cena</span>
                <span class="summary__value" style="color: var(--color-gold)">${state.selectedService?.price ?? 0} Kč</span>
            </div>
        `;
    }

    function validateForm() {
        let valid = true;

        // Name
        const name = dom.inputName.value.trim();
        const errName = document.getElementById('error-name');
        if (!name) {
            errName.textContent = 'Vyplňte jméno a příjmení';
            dom.inputName.classList.add('form__input--invalid');
            valid = false;
        } else {
            errName.textContent = '';
            dom.inputName.classList.remove('form__input--invalid');
        }

        // Email
        const email = dom.inputEmail.value.trim();
        const errEmail = document.getElementById('error-email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            errEmail.textContent = 'Zadejte platný e-mail';
            dom.inputEmail.classList.add('form__input--invalid');
            valid = false;
        } else {
            errEmail.textContent = '';
            dom.inputEmail.classList.remove('form__input--invalid');
        }

        // Phone
        const phone = dom.inputPhone.value.trim();
        const errPhone = document.getElementById('error-phone');
        const phoneRegex = /^[+]?[\d\s()-]{7,}$/;
        if (!phone || !phoneRegex.test(phone)) {
            errPhone.textContent = 'Zadejte platné telefonní číslo';
            dom.inputPhone.classList.add('form__input--invalid');
            valid = false;
        } else {
            errPhone.textContent = '';
            dom.inputPhone.classList.remove('form__input--invalid');
        }

        return valid;
    }

    // Clear validation on input
    [dom.inputName, dom.inputEmail, dom.inputPhone].forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('form__input--invalid');
            const errEl = document.getElementById('error-' + input.id.replace('input-', ''));
            if (errEl) errEl.textContent = '';
        });
    });

    // ================================================================
    // EVENT HANDLERS
    // ================================================================

    dom.btnToStep2.addEventListener('click', () => goToStep(2));
    dom.btnToStep3.addEventListener('click', () => goToStep(3));
    dom.btnBack1.addEventListener('click', () => goToStep(1));
    dom.btnBack2.addEventListener('click', () => goToStep(2));
    dom.btnRestart.addEventListener('click', () => {
        // Reset state
        state.selectedService = null;
        state.selectedBarber = null;
        state.selectedDate = null;
        state.selectedTime = null;
        state.calendarMonth = new Date().getMonth();
        state.calendarYear = new Date().getFullYear();

        // Reset form
        dom.contactForm.reset();
        document.querySelectorAll('.form__error').forEach(e => e.textContent = '');
        document.querySelectorAll('.form__input--invalid').forEach(e => e.classList.remove('form__input--invalid'));

        // Re-render and go to step 1
        renderServices();
        renderBarbers();
        updateStep1Button();
        goToStep(1);
    });

    // Calendar navigation
    dom.calPrev.addEventListener('click', () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Can't go earlier than current month
        if (state.calendarYear === currentYear && state.calendarMonth <= currentMonth) return;

        state.calendarMonth--;
        if (state.calendarMonth < 0) {
            state.calendarMonth = 11;
            state.calendarYear--;
        }
        renderCalendar();
    });

    dom.calNext.addEventListener('click', () => {
        state.calendarMonth++;
        if (state.calendarMonth > 11) {
            state.calendarMonth = 0;
            state.calendarYear++;
        }
        renderCalendar();
    });

    // Form submission
    dom.contactForm.addEventListener('submit', e => {
        e.preventDefault();
        if (validateForm()) {
            goToStep('success');
        }
    });

    // ================================================================
    // INIT
    // ================================================================

    renderServices();
    renderBarbers();
    updateStep1Button();

})();
