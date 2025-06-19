export const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={() => onOpenChange && onOpenChange(false)}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
};
export const DialogContent = ({ children, className = "" }) => (
  <div className={"bg-white p-4 " + className}>{children}</div>
);
export const DialogHeader = ({ children }) => <div>{children}</div>;
export const DialogTitle = ({ children }) => (
  <h3 className="font-bold text-lg mb-2">{children}</h3>
);
