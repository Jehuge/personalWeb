import React from 'react';
import styled, { css } from 'styled-components';

interface CategoryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

const StyledButton = styled.button<{ $active?: boolean }>`
  padding: 0.1em 0.25em;
  width: 13em;
  height: 4.2em;
  background-color: #212121;
  border: 0.08em solid #fff;
  border-radius: 0.3em;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;

  span {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    bottom: 0.4em;
    width: 8.25em;
    height: 2.5em;
    background-color: #212121;
    border-radius: 0.2em;
    font-size: 1.5em;
    color: #fff;
    border: 0.08em solid #fff;
    box-shadow: 0 0.4em 0.1em 0.019em #fff;
    transition: all 0.5s;

    ${({ $active }) =>
      $active &&
      css`
        transform: translate(0, 0.4em);
        box-shadow: 0 0 0 0 #fff;
      `}
  }

  span:hover {
    transition: all 0.5s;
    transform: translate(0, 0.4em);
    box-shadow: 0 0 0 0 #fff;
  }

  span:not(hover) {
    transition: all 1s;
  }
`;

const CategoryButton: React.FC<CategoryButtonProps> = ({ label, active, ...rest }) => {
  return (
    <StyledButton $active={active} {...rest}>
      <span>{label}</span>
    </StyledButton>
  );
};

export default CategoryButton;



