export const Card = ({ children, className = "" }) => (
  <div className={"border rounded p-4 shadow " + className}>{children}</div>
);
export const CardHeader = ({ children, className = "" }) => (
  <div className={"mb-2 " + className}>{children}</div>
);
export const CardTitle = ({ children, className = "" }) => (
  <h2 className={"font-bold text-lg " + className}>{children}</h2>
);
export const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);
