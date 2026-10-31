import React, { useState } from 'react';

// Vive fuera de App para que el menú desplegable no se cierre solo cada vez que App vuelve a renderizar.
// En celulares las opciones se esconden detrás del botón ☰ (ver .nav-toggle en App.css).
const Navbar = ({ items, currentPage, onNavigate, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const currentItem = items.find(item => item.toLowerCase() === currentPage);

    return (
        <nav className={`navbar ${isMenuOpen ? 'is-open' : ''}`}>
            <button
                type="button"
                className="nav-toggle"
                aria-expanded={isMenuOpen}
                aria-controls="nav-list"
                onClick={() => setIsMenuOpen(open => !open)}
            >
                <span className="nav-toggle-icon" aria-hidden="true">{isMenuOpen ? '✕' : '☰'}</span>
                <span className="nav-toggle-label">{currentItem || 'Menú'}</span>
            </button>
            <ul id="nav-list" className="nav-list">
                {items.map(item => (
                    <li key={item}>
                        <button
                            onClick={() => { onNavigate(item.toLowerCase()); setIsMenuOpen(false); }}
                            className={`nav-button ${currentPage === item.toLowerCase() ? 'active' : ''}`}
                        >
                            {item}
                        </button>
                    </li>
                ))}
            </ul>
            {onLogout && (
                <button onClick={onLogout} className="logout-button">Cerrar Sesión</button>
            )}
        </nav>
    );
};

export default Navbar;
