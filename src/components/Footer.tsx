'use client';

import React from 'react';
import { useLocale } from './LocaleProvider';

export default function Footer() {
    const { t } = useLocale();
    const year = new Date().getFullYear();

    return (
        <footer className="footer" role="contentinfo">
            <div className="footer-content">
                <div style={{ marginBottom: '1rem' }}>
                    <img src="/utsyn_logo.png" alt="Restaurant Utsyn" style={{ height: '160px', width: 'auto' }} />
                </div>
                <p>{t('footer_school')}</p>
                <p>© {year} Restaurant Utsyn. {t('footer_rights')}.</p>
            </div>
        </footer>
    );
}
