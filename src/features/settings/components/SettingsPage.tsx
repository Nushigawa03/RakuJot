import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSettings } from '../hooks/useSettings';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings, updateSetting, isLoaded } = useSettings();
    const [showApiKey, setShowApiKey] = useState(false);

    if (!isLoaded) {
        return null; // or a loading spinner
    }

    return (
        <div className="settings-page">
            <header className="settings-header">
                <button
                    className="settings-back-button"
                    onClick={() => navigate('/app')}
                    aria-label="戻る"
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    設定
                </button>
            </header>

            <main className="settings-content">
                <section className="settings-section animate-slideInUp">
                    <h2 className="settings-section-title">AI機能</h2>

                    <div className="setting-item hover-lift">
                        <div className="setting-item-info">
                            <label htmlFor="ai-toggle" className="setting-item-label">
                                AIを使用する
                            </label>
                            <p className="setting-item-description">
                                AIによるメモの自動分析やタグ付けを使用します。オフにすると通信量を節約できます。
                            </p>
                        </div>
                        <div className="setting-item-control">
                            <label className="rakujot-toggle">
                                <input
                                    type="checkbox"
                                    id="ai-toggle"
                                    checked={settings.aiUsageEnabled}
                                    onChange={(e) => updateSetting('aiUsageEnabled', e.target.checked)}
                                />
                                <span className="rakujot-toggle-slider" />
                            </label>
                        </div>
                    </div>

                    <div className="setting-item setting-input-item hover-lift">
                        <div className="setting-item-info">
                            <label htmlFor="google-api-key" className="setting-item-label">
                                Google AI APIキー
                            </label>
                            <p className="setting-item-description">
                                自身のGemini APIキーを利用することで制限を回避できます。空欄の場合はデフォルト動作になります。
                            </p>
                        </div>
                        <div className="setting-item-input-container">
                            <input
                                type={showApiKey ? "text" : "password"}
                                id="google-api-key"
                                className="rakujot-api-key-input"
                                value={settings.googleApiKey || ''}
                                onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                                placeholder="AIzaSy..."
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowApiKey(!showApiKey)}
                                aria-label={showApiKey ? "APIキーを隠す" : "APIキーを表示する"}
                            >
                                {showApiKey ? (
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Additional setting sections can go here in the future */}
            </main>
        </div>
    );
};

export default SettingsPage;
