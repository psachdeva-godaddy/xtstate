import React from 'react';
import { CardData } from '../machines/staticCardsMachine';
import './StaticCards.css';

interface StaticCardsProps {
  cards: CardData[];
  isLoading: boolean;
  error: Error | null;
}

export const StaticCards: React.FC<StaticCardsProps> = ({ cards, isLoading, error }) => {
  if (isLoading) {
    return <div className="static-cards-container loading">Loading cards...</div>;
  }

  if (error) {
    return <div className="static-cards-container error">Error loading cards: {error.message}</div>;
  }

  if (!cards.length) {
    return <div className="static-cards-container empty">No cards available</div>;
  }

  return (
    <div className="static-cards-container">
      {cards.map(card => (
        <div key={card.id} className={`static-card ${card.type}`}>
          <h3 className="card-title">{card.title}</h3>
          <div className="card-value">{card.value}</div>
        </div>
      ))}
    </div>
  );
}; 