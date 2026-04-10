export type Locale = 'no' | 'en';

export const translations = {
    no: {
        // Navigation
        nav_home: 'Hjem',
        nav_book: 'Bestill bord',
        nav_about: 'Om oss',
        nav_contact: 'Kontakt',
        nav_admin: 'Admin',
        nav_language: 'English',

        // Hero
        hero_title: 'Velkommen til Restaurant Utsyn',
        hero_subtitle: 'Nyt utsikten og maten på Tangen VGS',
        hero_cta: 'Bestill bord her',

        // Info section
        info_hours_title: 'Åpningstider',
        info_price_title: 'Priser',
        info_location_title: 'Sted',
        info_main_course: 'Hovedrett',
        info_dessert: 'Dessert',
        info_closed: 'Stengt',

        // About
        about_title: 'Om oss',

        // Contact
        contact_title: 'Kontakt oss',
        contact_phone: 'Telefon',
        contact_email: 'E-post',
        contact_address: 'Adresse',

        // Booking wizard
        book_title: 'Bestill bord',
        book_step_guests: 'Antall gjester',
        book_step_date: 'Velg dato',
        book_step_time: 'Velg tid',
        book_step_info: 'Dine opplysninger',
        book_step_confirm: 'Bekreft',
        book_guests_question: 'Hvor mange gjester?',
        book_guests_custom: 'Annet antall',
        book_guests_input: 'Skriv inn antall',
        book_date_select: 'Velg en dato',
        book_time_select: 'Velg tidspunkt',
        book_time_available: 'Ledig',
        book_time_full: 'Fullt',
        book_name: 'Navn',
        book_name_placeholder: 'Ditt fulle navn',
        book_phone: 'Telefonnummer',
        book_phone_placeholder: 'Ditt telefonnummer',
        book_email: 'E-post (valgfritt)',
        book_email_placeholder: 'Din e-postadresse',
        book_comment: 'Kommentar',
        book_comment_placeholder: 'Allergier, spesielle ønsker, etc.',
        book_back: 'Tilbake',
        book_next: 'Neste',
        book_confirm: 'Bekreft bestilling',
        book_edit: 'Rediger',
        book_summary_guests: 'Antall personer',
        book_summary_date: 'Dato og tid',
        book_persons: 'personer',

        // Confirmation
        confirm_title: 'Tusen takk',
        confirm_subtitle: 'for din bestilling!',
        confirm_message: 'Vi sender deg en bekreftelse på melding.',
        confirm_code: 'Bekreftelseskode',
        confirm_home: 'Til hovedsiden',

        // Errors
        error_name_required: 'Navn er påkrevd',
        error_phone_required: 'Telefonnummer er påkrevd',
        error_phone_invalid: 'Ugyldig telefonnummer',
        error_email_invalid: 'Ugyldig e-postadresse',
        error_booking_failed: 'Bestillingen feilet. Vennligst prøv igjen.',
        error_no_slots: 'Ingen ledige tider denne dagen',
        error_date_closed: 'Restauranten er stengt denne dagen',

        // Days
        day_mon: 'Man',
        day_tue: 'Tir',
        day_wed: 'Ons',
        day_thu: 'Tor',
        day_fri: 'Fre',
        day_sat: 'Lør',
        day_sun: 'Søn',

        day_monday: 'Mandag',
        day_tuesday: 'Tirsdag',
        day_wednesday: 'Onsdag',
        day_thursday: 'Torsdag',
        day_friday: 'Fredag',
        day_saturday: 'Lørdag',
        day_sunday: 'Søndag',

        // Months
        month_january: 'Januar',
        month_february: 'Februar',
        month_march: 'Mars',
        month_april: 'April',
        month_may: 'Mai',
        month_june: 'Juni',
        month_july: 'Juli',
        month_august: 'August',
        month_september: 'September',
        month_october: 'Oktober',
        month_november: 'November',
        month_december: 'Desember',

        // Admin
        admin_login_title: 'Logg inn',
        admin_username: 'Brukernavn',
        admin_password: 'Passord',
        admin_login_btn: 'Logg inn',
        admin_logout: 'Logg ut',
        admin_dashboard: 'Oversikt',
        admin_reservations: 'Reservasjoner',
        admin_settings: 'Innstillinger',
        admin_users: 'Brukere',
        admin_today: 'I dag',
        admin_upcoming: 'Fremtidige',
        admin_total_guests: 'Totalt gjester',
        admin_status_needs_seat: 'Venter på bord',
        admin_status_confirmed: 'Bekreftet',
        admin_status_cancelled: 'Kansellert',
        admin_status_completed: 'Fullført',
        admin_status_no_show: 'Møtte ikke',
        admin_cancel: 'Kanseller',
        admin_complete: 'Fullfør',
        admin_no_show: 'Møtte ikke',
        admin_save: 'Lagre',
        admin_saved: 'Lagret!',
        admin_add_user: 'Legg til bruker',
        admin_edit_hours: 'Rediger åpningstider',
        admin_edit_content: 'Rediger innhold',
        admin_add_closure: 'Legg til stengt dag',
        admin_closures: 'Stengte dager',
        admin_no_reservations: 'Ingen reservasjoner',
        admin_delete: 'Slett',
        admin_role: 'Rolle',
        admin_created: 'Opprettet',

        // Accessibility
        a11y_skip_nav: 'Hopp til hovedinnhold',
        a11y_increase_font: 'Øk skriftstørrelse',
        a11y_decrease_font: 'Reduser skriftstørrelse',
        a11y_high_contrast: 'Høy kontrast',

        // Menu
        menu_today: 'Meny i dag',
        menu_daily_title: 'Dagens meny',
        menu_daily_manage: 'Dagsmeny',
        menu_daily_desc: 'Velg hvilke retter som skal være tilgjengelige på en bestemt dato. Hvis ingen retter er valgt, vises alle aktive retter.',
        menu_daily_date: 'Dato',
        menu_daily_save: 'Lagre dagsmeny',
        menu_daily_saved: 'Dagsmeny lagret!',
        menu_daily_reset: 'Tilbakestill til standard',
        menu_daily_reset_done: 'Dagsmeny tilbakestilt til standard',
        menu_daily_using_default: 'Bruker standardmeny',
        menu_daily_custom: 'Tilpasset dagsmeny',
        menu_no_items_today: 'Ingen meny tilgjengelig i dag',

        // Footer
        footer_rights: 'Alle rettigheter forbeholdt',
        footer_school: 'Tangen videregående skole',
    },
    en: {
        // Navigation
        nav_home: 'Home',
        nav_book: 'Book a table',
        nav_about: 'About us',
        nav_contact: 'Contact',
        nav_admin: 'Admin',
        nav_language: 'Norsk',

        // Hero
        hero_title: 'Welcome to Restaurant Utsyn',
        hero_subtitle: 'Enjoy the view and food at Tangen VGS',
        hero_cta: 'Book a table',

        // Info section
        info_hours_title: 'Opening Hours',
        info_price_title: 'Prices',
        info_location_title: 'Location',
        info_main_course: 'Main course',
        info_dessert: 'Dessert',
        info_closed: 'Closed',

        // About
        about_title: 'About Us',

        // Contact
        contact_title: 'Contact Us',
        contact_phone: 'Phone',
        contact_email: 'Email',
        contact_address: 'Address',

        // Booking wizard
        book_title: 'Book a Table',
        book_step_guests: 'Number of guests',
        book_step_date: 'Select date',
        book_step_time: 'Select time',
        book_step_info: 'Your information',
        book_step_confirm: 'Confirm',
        book_guests_question: 'How many guests?',
        book_guests_custom: 'Other number',
        book_guests_input: 'Enter number',
        book_date_select: 'Choose a date',
        book_time_select: 'Choose a time',
        book_time_available: 'Available',
        book_time_full: 'Full',
        book_name: 'Name',
        book_name_placeholder: 'Your full name',
        book_phone: 'Phone number',
        book_phone_placeholder: 'Your phone number',
        book_email: 'Email (optional)',
        book_email_placeholder: 'Your email address',
        book_comment: 'Comment',
        book_comment_placeholder: 'Allergies, special requests, etc.',
        book_back: 'Back',
        book_next: 'Next',
        book_confirm: 'Confirm booking',
        book_edit: 'Edit',
        book_summary_guests: 'Number of guests',
        book_summary_date: 'Date and time',
        book_persons: 'persons',

        // Confirmation
        confirm_title: 'Thank you',
        confirm_subtitle: 'for your booking!',
        confirm_message: 'We will send you a confirmation message.',
        confirm_code: 'Confirmation code',
        confirm_home: 'Back to home',

        // Errors
        error_name_required: 'Name is required',
        error_phone_required: 'Phone number is required',
        error_phone_invalid: 'Invalid phone number',
        error_email_invalid: 'Invalid email address',
        error_booking_failed: 'Booking failed. Please try again.',
        error_no_slots: 'No available times this day',
        error_date_closed: 'The restaurant is closed this day',

        // Days
        day_mon: 'Mon',
        day_tue: 'Tue',
        day_wed: 'Wed',
        day_thu: 'Thu',
        day_fri: 'Fri',
        day_sat: 'Sat',
        day_sun: 'Sun',

        day_monday: 'Monday',
        day_tuesday: 'Tuesday',
        day_wednesday: 'Wednesday',
        day_thursday: 'Thursday',
        day_friday: 'Friday',
        day_saturday: 'Saturday',
        day_sunday: 'Sunday',

        // Months
        month_january: 'January',
        month_february: 'February',
        month_march: 'March',
        month_april: 'April',
        month_may: 'May',
        month_june: 'June',
        month_july: 'July',
        month_august: 'August',
        month_september: 'September',
        month_october: 'October',
        month_november: 'November',
        month_december: 'December',

        // Admin
        admin_login_title: 'Log in',
        admin_username: 'Username',
        admin_password: 'Password',
        admin_login_btn: 'Log in',
        admin_logout: 'Log out',
        admin_dashboard: 'Dashboard',
        admin_reservations: 'Reservations',
        admin_settings: 'Settings',
        admin_users: 'Users',
        admin_today: 'Today',
        admin_upcoming: 'Upcoming',
        admin_total_guests: 'Total guests',
        admin_status_needs_seat: 'Waiting for table',
        admin_status_confirmed: 'Confirmed',
        admin_status_cancelled: 'Cancelled',
        admin_status_completed: 'Completed',
        admin_status_no_show: 'No show',
        admin_cancel: 'Cancel',
        admin_complete: 'Complete',
        admin_no_show: 'No show',
        admin_save: 'Save',
        admin_saved: 'Saved!',
        admin_add_user: 'Add user',
        admin_edit_hours: 'Edit opening hours',
        admin_edit_content: 'Edit content',
        admin_add_closure: 'Add closure',
        admin_closures: 'Closed dates',
        admin_no_reservations: 'No reservations',
        admin_delete: 'Delete',
        admin_role: 'Role',
        admin_created: 'Created',

        // Accessibility
        a11y_skip_nav: 'Skip to main content',
        a11y_increase_font: 'Increase font size',
        a11y_decrease_font: 'Decrease font size',
        a11y_high_contrast: 'High contrast',

        // Menu
        menu_today: 'Today\'s menu',
        menu_daily_title: 'Daily menu',
        menu_daily_manage: 'Daily menu',
        menu_daily_desc: 'Choose which dishes should be available on a specific date. If no dishes are selected, all active dishes will be shown.',
        menu_daily_date: 'Date',
        menu_daily_save: 'Save daily menu',
        menu_daily_saved: 'Daily menu saved!',
        menu_daily_reset: 'Reset to default',
        menu_daily_reset_done: 'Daily menu reset to default',
        menu_daily_using_default: 'Using default menu',
        menu_daily_custom: 'Custom daily menu',
        menu_no_items_today: 'No menu available today',

        // Footer
        footer_rights: 'All rights reserved',
        footer_school: 'Tangen Upper Secondary School',
    },
} as const;

export type TranslationKey = keyof typeof translations.no;

export function t(key: TranslationKey, locale: Locale = 'no'): string {
    return translations[locale][key] || translations.no[key] || key;
}
