import React from 'react';

type CommonButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

const CommonButton: React.FC<CommonButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-8 py-3 rounded-lg text-black font-medium text-lg
        bg-gradient-to-b from-[#F9D78C] to-[#E7B45A]
        hover:opacity-80 transition-opacity duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default CommonButton;
