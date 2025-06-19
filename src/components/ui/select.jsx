export const Select = ({ value, onChange, children, className = "" }) => (
  <select
    className={"border p-1 " + className}
    value={value}
    onChange={e => onChange && onChange(e.target.value)}
  >
    {children}
  </select>
);
export const SelectTrigger = ({ children }) => <>{children}</>;
export const SelectContent = ({ children }) => <>{children}</>;
export const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);
