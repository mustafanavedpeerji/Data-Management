import React from 'react';
import { useNavigation } from '../context/NavigationContext';

interface SafeLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const SafeLink: React.FC<SafeLinkProps> = ({ to, children, className, onClick }) => {
  const { navigateWithConfirm } = useNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // Navigate with confirmation check
    navigateWithConfirm(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

export default SafeLink;