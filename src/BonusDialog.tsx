import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  spins: number;
  price: string;
  balanceAfter: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Confirmation for the bonus buy, in the game's look (replaces window.confirm).
// Uses the native <dialog>: showModal() traps the focus, blocks the page behind it
// and closes with Esc, so the keyboard and screen readers work without extra code.
export function BonusDialog({ open, spins, price, balanceAfter, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus(); // start on the safe option: Enter does not buy by accident
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="bonus-title"
      aria-describedby="bonus-text"
      onClose={onClose}
      // a click on the dark area around the box (the <dialog> itself) also closes
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dialog-box">
        <h2 id="bonus-title">Comprar bônus?</h2>
        <p id="bonus-text">
          Você vai direto para <b>{spins} rodadas grátis</b> por <b>{price}</b>. O saldo fica em {balanceAfter}.
        </p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="confirm" onClick={onConfirm}>
            Comprar
          </button>
        </div>
      </div>
    </dialog>
  );
}
