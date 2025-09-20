import React from 'react';
import { highlightMatch } from '../../utils/searchHighlighting';

interface SearchHighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

const SearchHighlightedText: React.FC<SearchHighlightedTextProps> = ({
  text,
  searchTerm,
  className = '',
  highlightClassName = 'bg-yellow-200 px-1 rounded'
}) => {
  if (!searchTerm.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const highlightedParts = highlightMatch(text, searchTerm);

  return (
    <span className={className}>
      {highlightedParts.map((part, index) => (
        part.isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </span>
  );
};

export default SearchHighlightedText;
