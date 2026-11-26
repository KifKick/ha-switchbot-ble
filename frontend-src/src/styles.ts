import { css } from "lit";

/**
 * Building blocks styled after Home Assistant's own cards, lists and buttons,
 * using the theme variables so light / dark / custom themes apply.
 */
export const sharedStyles = css`
  :host {
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif));
    -webkit-font-smoothing: var(--ha-font-smoothing, antialiased);
  }
  * {
    box-sizing: border-box;
  }

  /* cards */
  .card {
    display: block;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    box-shadow: var(--ha-card-box-shadow, none);
    color: var(--primary-text-color);
  }
  .card-header {
    font-size: 20px;
    line-height: 28px;
    font-weight: 400;
    padding: 16px 16px 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-header .spacer {
    flex: 1;
  }
  .card-content {
    padding: 12px 16px 16px;
  }
  .card-actions {
    border-top: 1px solid var(--divider-color);
    padding: 8px 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .card-actions .spacer {
    flex: 1;
  }
  .secondary {
    color: var(--secondary-text-color);
  }
  .intro {
    color: var(--secondary-text-color);
    font-size: 14px;
    line-height: 20px;
    margin: 0;
  }

  /* list rows (ha-md-list-item look) */
  .list {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 8px 16px;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    font: inherit;
    text-align: left;
    width: 100%;
  }
  .item + .item {
    border-top: 1px solid var(--divider-color);
  }
  a.item,
  button.item {
    cursor: pointer;
  }
  a.item:hover,
  button.item:hover {
    background: var(--secondary-background-color);
  }
  a.item:focus-visible,
  button.item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
  .item .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .item .headline {
    font-size: 16px;
    line-height: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item .supporting {
    font-size: 14px;
    line-height: 20px;
    color: var(--secondary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item .meta {
    color: var(--secondary-text-color);
    font-size: 14px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .item sb-icon.leading {
    color: var(--state-icon-color, var(--secondary-text-color));
    flex: none;
  }

  /* buttons (ha-button look) */
  .btn {
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    min-height: 36px;
    padding: 8px 16px;
    border-radius: 18px;
    border: none;
    background: none;
    color: var(--primary-color);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .btn.outlined {
    border: 1px solid var(--outline-color, var(--divider-color));
  }
  .btn.filled {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .btn.filled:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 88%, #000);
  }
  .btn.danger {
    color: var(--error-color, #db4437);
  }
  .btn.small {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex: none;
  }
  .icon-btn:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* form fields */
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--secondary-text-color);
  }
  .field.grow {
    flex: 1;
    min-width: 160px;
  }
  input:not([type="checkbox"]):not([type="range"]),
  select {
    font: inherit;
    font-size: 15px;
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--outline-color, var(--divider-color));
    background: var(--mdc-text-field-fill-color, var(--secondary-background-color));
    color: var(--primary-text-color);
  }
  input:focus,
  select:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: -1px;
  }
  input:disabled,
  select:disabled {
    opacity: 0.55;
  }
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }
  input[type="range"] {
    accent-color: var(--primary-color);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
  .row.end {
    justify-content: flex-end;
  }

  /* chips and alerts */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 13px;
    line-height: 20px;
  }
  .chip b {
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 22%, transparent);
  }
  .chip.good {
    background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
  }
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 8px 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 20px;
    background: color-mix(in srgb, var(--alert-color, var(--info-color, #039be5)) 12%, transparent);
  }
  .alert sb-icon {
    color: var(--alert-color, var(--info-color, #039be5));
    flex: none;
  }
  .alert .text {
    flex: 1;
    min-width: 0;
  }
  .alert.error {
    --alert-color: var(--error-color, #db4437);
  }
  .alert.warning {
    --alert-color: var(--warning-color, #ffa600);
  }
  .alert.success {
    --alert-color: var(--success-color, #43a047);
  }
  .error-text {
    color: var(--error-color, #db4437);
  }
  .ok-text {
    color: var(--success-color, #43a047);
  }

  /* tables */
  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  table.data td {
    padding: 10px 16px;
    border-top: 1px solid var(--divider-color);
    vertical-align: middle;
  }
  table.data tr:first-child td {
    border-top: none;
  }
  table.data td.num {
    color: var(--secondary-text-color);
    width: 1%;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  table.data td.actions {
    text-align: right;
    white-space: nowrap;
  }
  .sub {
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--divider-color);
    border-top-color: var(--primary-color);
    animation: spin 0.9s linear infinite;
    display: inline-block;
    flex: none;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 3s;
    }
  }
`;

/** Centered column used by every page. */
export const pageStyles = css`
  .page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (max-width: 600px) {
    .page {
      padding: 8px;
      gap: 8px;
    }
  }
`;
