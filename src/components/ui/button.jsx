export const Button = ({ children, className = "", ...props }) => (
  <button className={"border px-2 py-1 rounded " + className} {...props}>
    {children}
  </button>
);
