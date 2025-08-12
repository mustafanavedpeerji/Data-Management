import React, { useEffect, useState } from "react";
import API_BASE_URL from '../config/api'; // Adjust path as needed
import apiClient from '../config/apiClient';

// Type definitions
interface Industry {
  id: number;
  industry_name: string;
  category: string;
  parent_id: number | null;
  children?: Industry[];
}

interface DraggableBlockProps {
  node: Industry;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onAddChild: (parentId: number) => void;
  onMoveToRoot: (id: number) => void;
  onMoveToParent: (childId: number, newParentId: number) => void;
  children?: React.ReactNode;
  level?: number;
  expandedNodes?: Set<number>;
  onToggleExpand?: (nodeId: number) => void;
  showExpandButton?: boolean;
}

interface MainCategoryBlockProps {
  category: Industry;
  isSelected: boolean;
  onClick: (category: Industry) => void;
  onDragOver: (e: React.DragEvent) => void;
  onRename: (id: number, name: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDelete: (id: number) => void;
  dragOver: boolean;
  position: number | null;
}

interface ComparisonPaneProps {
  category: Industry;
  position: number;
  onClose: () => void;
  tree: Industry[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onAddChild: (parentId: number) => void;
  onMoveToRoot: (id: number) => void;
  onMoveToParent: (childId: number, newParentId: number) => void;
  onDropFromOtherPane: (childId: number, newMainCategoryId: number) => void;
  paneScrollRef: React.MutableRefObject<Map<number, HTMLDivElement>>;
  expandedNodes: Set<number>;
  onToggleExpand: (nodeId: number) => void;
  onExpandAll: (categoryId: number) => void;
  onCollapseAll: (categoryId: number) => void;
}

interface TreeRecursiveProps {
  nodes: Industry[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onAddChild: (parentId: number) => void;
  onMoveToRoot: (id: number) => void;
  onMoveToParent: (childId: number, newParentId: number) => void;
  level?: number;
  expandedNodes: Set<number>;
  onToggleExpand: (nodeId: number) => void;
}

interface IndustryTreeProps {
  selectedIndustryId?: number;
}

interface DragData {
  id: number;
  type: 'main' | 'child';
  name?: string;
  level?: number;
}

// Modal Components
interface InputModalProps {
  isOpen: boolean;
  title: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const InputModal: React.FC<InputModalProps> = ({ isOpen, title, placeholder, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: '#333',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          {title}
        </h3>
        
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            marginBottom: '25px',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007cba'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#f5f5f5';
              target.style.borderColor = '#ccc';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = 'white';
              target.style.borderColor = '#e0e0e0';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: value.trim() ? '#007cba' : '#ccc',
              color: 'white',
              cursor: value.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (value.trim()) {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#0056b3';
                target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (value.trim()) {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#007cba';
                target.style.transform = 'translateY(0)';
              }
            }}
          >
            Confirm
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Yes', 
  cancelText = 'No',
  onConfirm, 
  onCancel,
  type = 'info'
}) => {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return { primary: '#dc3545', hover: '#c82333' };
      case 'warning':
        return { primary: '#ffc107', hover: '#e0a800' };
      default:
        return { primary: '#007cba', hover: '#0056b3' };
    }
  };

  const colors = getColors();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out'
      }}>
        <h3 style={{
          margin: '0 0 15px 0',
          color: '#333',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          {title}
        </h3>
        
        <p style={{
          margin: '0 0 25px 0',
          color: '#666',
          fontSize: '14px',
          lineHeight: '1.5',
          textAlign: 'center'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#f5f5f5';
              target.style.borderColor = '#ccc';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = 'white';
              target.style.borderColor = '#e0e0e0';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: colors.primary,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = colors.hover;
              target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = colors.primary;
              target.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------- Draggable Block ----------
const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  node, 
  onDelete, 
  onRename, 
  onAddChild, 
  onMoveToRoot, 
  onMoveToParent, 
  children, 
  level = 0,
  expandedNodes = new Set(),
  onToggleExpand,
  showExpandButton = false
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.industry_name);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const style: React.CSSProperties = {
    padding: "6px",
    margin: "1px 0",
    border: isDragging ? "2px dashed #007cba" : dragOver ? "2px solid #007cba" : "1px solid #ddd",
    borderRadius: "4px",
    background: isDragging ? "#f0f8ff" : dragOver ? "#e6f3ff" : level === 0 ? "#fff" : "#f9f9f9",
    marginLeft: `${level * 12}px`,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging ? "0 4px 15px rgba(0,0,0,0.2)" : dragOver ? "0 2px 8px rgba(0,124,186,0.2)" : "0 1px 2px rgba(0,0,0,0.1)",
    transition: isDragging ? "none" : "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
    zIndex: isDragging ? 1000 : 1,
  };

  const handleSave = () => {
    if (name.trim() && name !== node.industry_name) {
      onRename(node.id, name.trim());
    }
    setEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setName(node.industry_name);
      setEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (editing) {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ 
      id: node.id, 
      type: 'child',
      name: node.industry_name,
      level: level
    } as DragData));
    
    const dragImage = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.transform = "rotate(5deg)";
    dragImage.style.opacity = "0.8";
    dragImage.style.background = "#e6f3ff";
    dragImage.style.border = "2px solid #007cba";
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 25);
    
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragDataString = e.dataTransfer.getData("text/plain");
      if (!dragDataString) return;
      
      const dragData: DragData = JSON.parse(dragDataString);
      const draggedId = dragData.id;
      
      if (draggedId === node.id || isDescendant(node, draggedId)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    } catch (error) {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    try {
      const dragDataString = e.dataTransfer.getData("text/plain");
      if (!dragDataString) return;
      
      const dragData: DragData = JSON.parse(dragDataString);
      const draggedId = dragData.id;
      
      if (draggedId && draggedId !== node.id && !isDescendant(node, draggedId)) {
        onMoveToParent(draggedId, node.id);
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  };

  const isDescendant = (parentNode: Industry, targetId: number): boolean => {
    if (!parentNode.children) return false;
    
    for (let child of parentNode.children) {
      if (child.id === targetId) return true;
      if (isDescendant(child, targetId)) return true;
    }
    return false;
  };

  return (
    <div
      style={style}
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          {showExpandButton && node.children && node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleExpand) {
                  onToggleExpand(node.id);
                }
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                marginRight: "6px",
                fontSize: "12px",
                color: "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = "none";
              }}
            >
              {expandedNodes.has(node.id) ? '▼' : '▶'}
            </button>
          )}
          {!editing && (
            <span
              style={{
                marginRight: "8px",
                color: isDragging ? "#007cba" : "#666",
                cursor: "grab",
                fontSize: "14px",
                transition: "color 0.2s ease",
                userSelect: "none"
              }}
            >
              ⋮⋮
            </span>
          )}
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyPress}
              autoFocus
              style={{
                border: "2px solid #007cba",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "14px",
                outline: "none",
                flex: 1,
                backgroundColor: "#fff",
                boxShadow: "0 0 0 3px rgba(0,124,186,0.1)",
              }}
            />
          ) : (
            <div style={{ flex: 1 }}>
              <span
                onDoubleClick={() => setEditing(true)}
                style={{
                  cursor: "text",
                  padding: "3px 0",
                  fontSize: "13px",
                  fontWeight: "normal",
                  color: level === 0 ? "#333" : "#555",
                  userSelect: "none",
                  transition: "color 0.2s ease",
                  display: "block"
                }}
                title="Double-click to edit"
              >
                {name}
              </span>
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
          {level > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToRoot(node.id);
              }}
              title="Move to Root Level"
              style={{
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "3px",
                padding: "4px 6px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 3px rgba(40,167,69,0.2)",
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = "#218838";
                target.style.transform = "translateY(-1px)";
                target.style.boxShadow = "0 4px 8px rgba(40,167,69,0.3)";
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = "#28a745";
                target.style.transform = "translateY(0)";
                target.style.boxShadow = "0 2px 4px rgba(40,167,69,0.2)";
              }}
            >
              ↑
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            title="Add Child"
            style={{
              background: "#007cba",
              color: "white",
              border: "none",
              borderRadius: "3px",
              padding: "4px 6px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,124,186,0.2)",
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "#0056b3";
              target.style.transform = "translateY(-1px)";
              target.style.boxShadow = "0 4px 8px rgba(0,124,186,0.3)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "#007cba";
              target.style.transform = "translateY(0)";
              target.style.boxShadow = "0 2px 4px rgba(0,124,186,0.2)";
            }}
          >
            +
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="Delete"
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "3px",
              padding: "4px 6px",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(220,53,69,0.2)"
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "#c82333";
              target.style.transform = "translateY(-1px)";
              target.style.boxShadow = "0 4px 8px rgba(220,53,69,0.3)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "#dc3545";
              target.style.transform = "translateY(0)";
              target.style.boxShadow = "0 2px 4px rgba(220,53,69,0.2)";
            }}
          >
            ×
          </button>
        </div>
      </div>
      
      {children && (!showExpandButton || expandedNodes.has(node.id)) && (
        <div 
          style={{ marginTop: "6px" }}
          onDragStart={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
      
      {dragOver && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,124,186,0.1)",
          borderRadius: "8px",
          pointerEvents: "none",
          border: "2px solid #007cba",
          animation: "pulse 1s infinite"
        }} />
      )}
    </div>
  );
};

// ----------- Main Category Block ----------
const MainCategoryBlock: React.FC<MainCategoryBlockProps> = ({ 
  category, 
  isSelected, 
  onClick, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onDelete,
  onRename, 
  dragOver, 
  position 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.industry_name);

  const handleSave = () => {
    if (name.trim() && name !== category.industry_name) {
      onRename(category.id, name.trim());
    }
    setEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setName(category.industry_name);
      setEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (editing) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: category.id, type: 'main' } as DragData));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      style={{
        padding: "8px 10px",
        margin: "3px",
        border: isSelected ? "2px solid #007cba" : dragOver ? "2px dashed #007cba" : "1px solid #e0e0e0",
        borderRadius: "6px",
        background: isDragging ? "#f0f8ff" : isSelected ? "#e6f3ff" : dragOver ? "#f0f8ff" : "#fff",
        cursor: editing ? "text" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 3px 12px rgba(0,124,186,0.3)" : dragOver ? "0 2px 8px rgba(0,124,186,0.2)" : "0 1px 4px rgba(0,0,0,0.1)",
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
        minWidth: "80px",
        textAlign: "center",
        position: "relative"
      }}
      draggable={!editing}
      onClick={() => !editing && onClick(category)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          style={{
            border: "2px solid #007cba",
            borderRadius: "4px",
            padding: "6px 10px",
            fontSize: "16px",
            outline: "none",
            width: "100%",
            backgroundColor: "#fff",
            boxShadow: "0 0 0 3px rgba(0,124,186,0.1)",
            textAlign: "center"
          }}
        />
      ) : (
        <div>
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: isSelected ? "#007cba" : "#333",
              marginBottom: "3px"
            }}
          >
            {category.industry_name}
          </div>
        </div>
      )}
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(category.id);
        }}
        title="Delete Main Category"
        style={{
          position: "absolute",
          top: "-8px",
          left: "-8px",
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(220,53,69,0.3)",
          transition: "all 0.2s ease",
          opacity: 0.8
        }}
        onMouseEnter={(e) => {
          const target = e.target as HTMLButtonElement;
          target.style.opacity = "1";
          target.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLButtonElement;
          target.style.opacity = "0.8";
          target.style.transform = "scale(1)";
        }}
      >
        ×
      </button>
      
      {isSelected && position && (
        <div style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          background: "#007cba",
          color: "white",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "bold",
          boxShadow: "0 2px 8px rgba(0,124,186,0.3)"
        }}>
          {position}
        </div>
      )}
    </div>
  );
};

// ----------- Comparison Pane ----------
const ComparisonPane: React.FC<ComparisonPaneProps> = ({ 
  category, 
  position, 
  onClose, 
  tree, 
  onDelete, 
  onRename, 
  onAddChild, 
  onMoveToRoot, 
  onMoveToParent, 
  onDropFromOtherPane,
  paneScrollRef,
  expandedNodes,
  onToggleExpand,
  onExpandAll,
  onCollapseAll
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dragDataString = e.dataTransfer.getData("text/plain");
      if (!dragDataString) return;
      
      const dragData: DragData = JSON.parse(dragDataString);
      if (dragData.type === 'child') {
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    } catch (error) {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    try {
      const dragDataString = e.dataTransfer.getData("text/plain");
      if (!dragDataString) return;
      
      const dragData: DragData = JSON.parse(dragDataString);
      if (dragData.type === 'child' && dragData.id) {
        onDropFromOtherPane(dragData.id, category.id);
      }
    } catch (error) {
      console.error("Error handling drop in comparison pane:", error);
    }
  };

  return (
    <div
      style={{
        border: dragOver ? "2px solid #28a745" : "2px solid #007cba",
        borderRadius: "12px",
        background: dragOver ? "#f0fff0" : "#fff",
        overflow: "hidden",
        boxShadow: dragOver ? "0 4px 12px rgba(40,167,69,0.2)" : "0 4px 12px rgba(0,124,186,0.1)",
        transition: "all 0.2s ease"
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={{
        background: dragOver ? "#28a745" : "#007cba",
        color: "white",
        padding: "8px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "normal", fontSize: "15px" }}>
            {category.industry_name}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>
            Position #{position}
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(category.id);
            }}
            title={`Add child to ${category.industry_name}`}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "3px",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "3px"
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255,255,255,0.3)";
              target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255,255,255,0.2)";
              target.style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: "14px" }}>+</span>
            <span style={{ fontSize: "10px" }}>Add</span>
          </button>
        </div>
        
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "3px",
            padding: "3px 6px",
            cursor: "pointer",
            fontSize: "10px"
          }}
        >
          ✕
        </button>
      </div>
      
      {dragOver && (
        <div style={{
          background: "#f0fff0",
          border: "2px dashed #28a745",
          margin: "8px",
          padding: "12px",
          borderRadius: "8px",
          textAlign: "center",
          color: "#28a745",
          fontSize: "13px",
          fontWeight: "normal"
        }}>
          Drop here to move to {category.industry_name}
        </div>
      )}
      
      <div 
        ref={(el) => {
          if (el) {
            paneScrollRef.current.set(category.id, el);
          }
        }}
        style={{
          padding: "12px"
        }}>
        {tree.length > 0 && tree[0] && tree[0].children && tree[0].children.length > 0 ? (
          <TreeRecursive
            nodes={tree[0].children}
            onDelete={onDelete}
            onRename={onRename}
            onAddChild={onAddChild}
            onMoveToRoot={onMoveToRoot}
            onMoveToParent={onMoveToParent}
            level={1}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
          />
        ) : (
          <div style={{
            textAlign: "center",
            padding: "20px 15px",
            color: "#666",
            background: "#f8f9fa",
            borderRadius: "6px",
            border: "2px dashed #ddd"
          }}>
            <div style={{ fontSize: "20px", marginBottom: "8px", opacity: 0.3 }}>📝</div>
            <p style={{ marginBottom: "12px", fontSize: "13px" }}>No subcategories yet</p>
            <button
              onClick={() => onAddChild(category.id)}
              style={{
                background: "#007cba",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            >
              + Add First Subcategory
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------- Recursive Tree ----------
const TreeRecursive: React.FC<TreeRecursiveProps> = ({
  nodes,
  onDelete,
  onRename,
  onAddChild,
  onMoveToRoot,
  onMoveToParent,
  level = 0,
  expandedNodes,
  onToggleExpand
}) => {
  return (
    <div onDragStart={(e) => e.stopPropagation()}>
      {nodes.map((node: Industry) => (
        <DraggableBlock
          key={node.id}
          node={node}
          onDelete={onDelete}
          onRename={onRename}
          onAddChild={onAddChild}
          onMoveToRoot={onMoveToRoot}
          onMoveToParent={onMoveToParent}
          level={level}
          expandedNodes={expandedNodes}
          onToggleExpand={onToggleExpand}
          showExpandButton={true}
        >
          {node.children && node.children.length > 0 && (
            <TreeRecursive
              nodes={node.children}
              onDelete={onDelete}
              onRename={onRename}
              onAddChild={onAddChild}
              onMoveToRoot={onMoveToRoot}
              onMoveToParent={onMoveToParent}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          )}
        </DraggableBlock>
      ))}
    </div>
  );
};

// ----------- Main Industry Tree ----------
const IndustryTree: React.FC<IndustryTreeProps> = ({ selectedIndustryId }) => {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [tree, setTree] = useState<Industry[]>([]);
  const [mainCategories, setMainCategories] = useState<Industry[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainCategoriesOrder, setMainCategoriesOrder] = useState<number[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // EXPAND/COLLAPSE STATE MANAGEMENT
  const [expandedNodes, setExpandedNodes] = useState<Map<number, Set<number>>>(new Map());
  const [globalExpandState, setGlobalExpandState] = useState<boolean>(false);

  // SCROLL POSITION PRESERVATION
  const scrollPositionRef = React.useRef<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const preserveScrollRef = React.useRef<boolean>(false);
  const operationInProgressRef = React.useRef<boolean>(false);
  
  // COMPARISON PANE SCROLL PRESERVATION
  const paneScrollPositions = React.useRef<Map<number, number>>(new Map());
  const paneScrollRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // SCROLL POSITION SAVE FUNCTIONS
  const saveScrollPosition = React.useCallback(() => {
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    preserveScrollRef.current = true;
  }, []);

  const saveAllScrollPositions = React.useCallback(() => {
    // Save main page scroll
    saveScrollPosition();
    
    // Save all comparison pane scroll positions
    paneScrollRefs.current.forEach((element, categoryId) => {
      if (element) {
        paneScrollPositions.current.set(categoryId, element.scrollTop);
        console.log(`Saved scroll position for pane ${categoryId}: ${element.scrollTop}`);
      }
    });
  }, [saveScrollPosition]);

  // SCROLL POSITION RESTORE FUNCTIONS
  const restoreScrollPosition = React.useCallback(() => {
    if (preserveScrollRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'auto'
        });
        preserveScrollRef.current = false;
      }, 50);
      
      // Backup restore in case the first one fails
      setTimeout(() => {
        if (preserveScrollRef.current) {
          window.scrollTo({
            top: scrollPositionRef.current,
            behavior: 'auto'
          });
          preserveScrollRef.current = false;
        }
      }, 200);
    }
  }, []);

  const restoreAllScrollPositions = React.useCallback(() => {
    // Restore main page scroll
    restoreScrollPosition();
    
    // Restore comparison pane scroll positions
    setTimeout(() => {
      paneScrollPositions.current.forEach((scrollTop, categoryId) => {
        const element = paneScrollRefs.current.get(categoryId);
        if (element && scrollTop > 0) {
          console.log(`Restoring scroll position for pane ${categoryId}: ${scrollTop}`);
          element.scrollTop = scrollTop;
        }
      });
    }, 100);
    
    // Backup restore for panes
    setTimeout(() => {
      paneScrollPositions.current.forEach((scrollTop, categoryId) => {
        const element = paneScrollRefs.current.get(categoryId);
        if (element && scrollTop > 0 && element.scrollTop !== scrollTop) {
          console.log(`Backup restore for pane ${categoryId}: ${scrollTop}`);
          element.scrollTop = scrollTop;
        }
      });
    }, 300);
  }, [restoreScrollPosition]);

  // Modal states
  const [inputModal, setInputModal] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    onConfirm: (value: string) => void;
  }>({
    isOpen: false,
    title: '',
    placeholder: '',
    onConfirm: () => {}
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    loadIndustries();
  }, [selectedIndustryId]);

  const loadIndustries = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/industries/');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch industries: ${response.status} ${errorText}`);
      }
      const data: Industry[] = await response.json();
      setIndustries(data);
      const treeData = buildTree(data);
      setTree(treeData);
      
      const mains = data.filter(item => item.parent_id === null);
      setMainCategories(mains);
      setMainCategoriesOrder(mains.map(item => item.id));

      // SCROLL POSITION RESTORE
      restoreAllScrollPositions();
      
    } catch (error) {
      console.error("Failed to load industries:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load industries: ${errorMessage}\nPlease refresh the page and try again.`);
    }
    setLoading(false);
  }, [restoreAllScrollPositions]);

  const buildTree = (list: Industry[]): Industry[] => {
    const map: { [key: number]: Industry } = {};
    const roots: Industry[] = [];

    list.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    list.forEach((item) => {
      if (item.parent_id === null) {
        roots.push(map[item.id]);
      } else if (map[item.parent_id]) {
        map[item.parent_id].children!.push(map[item.id]);
      }
    });

    return roots;
  };

  const getCategoryByLevel = (level: number): string => {
    if (level === 0) return "Main Industry";
    if (level === 1) return "sub";
    if (level === 2) return "sub-sub";
    if (level === 3) return "sub-sub-sub";
    let category = "sub";
    for (let i = 1; i < level; i++) {
      category += "-sub";
    }
    return category;
  };

  const findNodeById = (nodes: Industry[], targetId: number): Industry | null => {
    for (let node of nodes) {
      if (node.id === targetId) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const getNodeLevel = (nodes: Industry[], targetId: number, currentLevel: number = 0): number => {
    for (let node of nodes) {
      if (node.id === targetId) return currentLevel;
      if (node.children && node.children.length > 0) {
        const level = getNodeLevel(node.children, targetId, currentLevel + 1);
        if (level !== -1) return level;
      }
    }
    return -1;
  };

  const handleCategorySelect = (category: Industry) => {
    const isAlreadySelected = selectedCategories.some(sc => sc.id === category.id);
    
    if (isAlreadySelected) {
      setSelectedCategories(prev => prev.filter(sc => sc.id !== category.id));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  const handleMainCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleMainCategoryDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleMainCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    try {
      const dragData: DragData = JSON.parse(e.dataTransfer.getData("text/plain"));
      
      if (dragData.type === 'main') {
        const draggedId = dragData.id;
        const newOrder = [...mainCategoriesOrder];
        const draggedIndex = newOrder.indexOf(draggedId);
        
        if (draggedIndex !== -1) {
          newOrder.splice(draggedIndex, 1);
          newOrder.splice(dropIndex, 0, draggedId);
          setMainCategoriesOrder(newOrder);
        }
      }
    } catch (error) {
      console.error("Error parsing drag data:", error);
    }
  };

  const getTreeForCategory = (categoryId: number): Industry[] => {
    const categoryNode = findNodeById(tree, categoryId);
    return categoryNode ? [categoryNode] : [];
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Industry',
      message: 'Are you sure you want to delete this industry and all its children? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.delete(`/industries/${id}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Delete failed: ${response.status} ${errorText}`);
          }
          await loadIndustries();
          setSelectedCategories(prev => prev.filter(sc => sc.id !== id));
        } catch (error) {
          console.error("Delete failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to delete industry: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const handleMainCategoryDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Main Category',
      message: 'Are you sure you want to delete this main category and all its subcategories? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.delete(`/industries/${id}`);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Delete failed: ${response.status} ${errorText}`);
          }
          await loadIndustries();
          setSelectedCategories(prev => prev.filter(sc => sc.id !== id));
        } catch (error) {
          console.error("Delete failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to delete main category: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const handleRename = async (id: number, name: string) => {
    // Prevent concurrent operations
    if (operationInProgressRef.current) {
      console.log("Operation already in progress, please wait...");
      return;
    }

    // Validate input
    if (!name || !name.trim()) {
      alert("Industry name cannot be empty");
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      alert("Industry name must be at least 2 characters long");
      return;
    }

    // SAVE SCROLL POSITION
    operationInProgressRef.current = true;
    saveAllScrollPositions();

    try {
      console.log(`Renaming industry ${id} to "${trimmedName}"`);
      
      // Try the standard endpoint first
      let response = await apiClient.put(`/industries/${id}`, { industry_name: trimmedName });

      // If that fails, try alternative endpoint
      if (!response.ok && response.status === 404) {
        console.log("Trying alternative endpoint...");
        response = await apiClient.put(`/industries/update/${id}`, { industry_name: trimmedName });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Rename failed - Response:", response.status, errorText);
        
        let errorMessage = `Failed to rename industry (${response.status}): `;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += errorData.detail || errorData.message || errorText;
        } catch {
          errorMessage += errorText || response.statusText || 'Unknown server error';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Rename successful:", result);
      await loadIndustries();
      
    } catch (error) {
      console.error("Rename failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to rename industry: ${errorMessage}`);
      preserveScrollRef.current = false; // Reset on error
    } finally {
      operationInProgressRef.current = false; // Always reset operation flag
    }
  };

  const handleAddChild = async (parentId: number) => {
    const parentLevel = getNodeLevel(tree, parentId);
    const childCategory = getCategoryByLevel(parentLevel + 1);
    
    setInputModal({
      isOpen: true,
      title: 'Add Child Industry',
      placeholder: 'Enter child industry name...',
      onConfirm: async (name: string) => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.post('/industries/', {
            industry_name: name,
            category: childCategory,
            parent_id: parentId,
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Add child failed: ${response.status} ${errorText}`);
          }
          await loadIndustries();
        } catch (error) {
          console.error("Add child failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to add child industry: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setInputModal({ ...inputModal, isOpen: false });
      }
    });
  };

  const handleMoveToRoot = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Move to Root Level',
      message: 'Are you sure you want to move this industry to the root level as a main category?',
      type: 'warning',
      onConfirm: async () => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.post('/industries/update-parent', { 
            id: id, 
            new_parent_id: null
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Move to root failed');
          }
          await loadIndustries();
        } catch (error) {
          console.error("Move to root failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to move industry to root: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const handleMoveToParent = async (childId: number, newParentId: number) => {
    saveAllScrollPositions();
    try {
      const response = await apiClient.post('/industries/update-parent', { 
        id: childId, 
        new_parent_id: newParentId
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Move failed');
      }
      await loadIndustries();
    } catch (error) {
      console.error("Move to parent failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to move industry: ${errorMessage}`);
      preserveScrollRef.current = false;
    }
  };

  const handleDropFromOtherPane = async (childId: number, newMainCategoryId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Move Between Categories',
      message: 'Are you sure you want to move this item to another main category?',
      type: 'info',
      onConfirm: async () => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.post('/industries/update-parent', { 
            id: childId, 
            new_parent_id: newMainCategoryId
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Move between categories failed');
          }
          await loadIndustries();
        } catch (error) {
          console.error("Move between categories failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to move industry between categories: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const handleAddRoot = async () => {
    setInputModal({
      isOpen: true,
      title: 'Add New Industry',
      placeholder: 'Enter industry name...',
      onConfirm: async (name: string) => {
        saveAllScrollPositions();
        try {
          const response = await apiClient.post('/industries/', {
            industry_name: name,
            category: "main",
            parent_id: null,
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Add industry failed: ${response.status} ${errorText}`);
          }
          await loadIndustries();
        } catch (error) {
          console.error("Add industry failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to add industry: ${errorMessage}`);
          preserveScrollRef.current = false;
        }
        setInputModal({ ...inputModal, isOpen: false });
      }
    });
  };

  // EXPAND/COLLAPSE HANDLERS
  const handleToggleExpand = (categoryId: number, nodeId: number) => {
    setExpandedNodes(prev => {
      const newMap = new Map(prev);
      const categorySet = newMap.get(categoryId) || new Set();
      const newSet = new Set(categorySet);
      
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      
      newMap.set(categoryId, newSet);
      return newMap;
    });
  };

  const handleExpandAll = (categoryId: number) => {
    const categoryTree = getTreeForCategory(categoryId);
    if (categoryTree.length === 0) return;
    
    const getAllNodeIds = (nodes: Industry[]): number[] => {
      const ids: number[] = [];
      nodes.forEach(node => {
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          ids.push(...getAllNodeIds(node.children));
        }
      });
      return ids;
    };
    
    const allNodeIds = getAllNodeIds(categoryTree[0].children || []);
    
    setExpandedNodes(prev => {
      const newMap = new Map(prev);
      newMap.set(categoryId, new Set(allNodeIds));
      return newMap;
    });
  };

  const handleCollapseAll = (categoryId: number) => {
    setExpandedNodes(prev => {
      const newMap = new Map(prev);
      newMap.set(categoryId, new Set());
      return newMap;
    });
  };

  // GLOBAL EXPAND/COLLAPSE FUNCTIONS
  const isAnyNodeExpanded = () => {
    for (const [categoryId, nodeSet] of expandedNodes) {
      if (nodeSet.size > 0) {
        return true;
      }
    }
    return false;
  };

  const handleGlobalExpandCollapseAll = () => {
    const hasExpandedNodes = isAnyNodeExpanded();
    
    if (hasExpandedNodes) {
      // Currently has expanded nodes, so collapse all
      setExpandedNodes(new Map());
      setGlobalExpandState(false);
    } else {
      // Currently collapsed, so expand all
      const newMap = new Map<number, Set<number>>();
      
      selectedCategories.forEach(category => {
        const categoryTree = getTreeForCategory(category.id);
        if (categoryTree.length > 0) {
          const getAllNodeIds = (nodes: Industry[]): number[] => {
            const ids: number[] = [];
            nodes.forEach(node => {
              ids.push(node.id);
              if (node.children && node.children.length > 0) {
                ids.push(...getAllNodeIds(node.children));
              }
            });
            return ids;
          };
          
          const allNodeIds = getAllNodeIds(categoryTree[0].children || []);
          newMap.set(category.id, new Set(allNodeIds));
        }
      });
      
      setExpandedNodes(newMap);
      setGlobalExpandState(true);
    }
  };

  const orderedMainCategories = mainCategoriesOrder
    .map(id => mainCategories.find(cat => cat.id === id))
    .filter((cat): cat is Industry => cat !== undefined);

  if (loading) {
    return (
      <div style={{
        padding: "20px",
        textAlign: "center",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #007cba',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '10px' }}>Loading industries...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      fontFamily: "Arial, sans-serif",
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 20px 10px 20px"
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.1; }
          50% { opacity: 0.2; }
          100% { opacity: 0.1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "25px",
        paddingBottom: "20px",
        borderBottom: "2px solid #f0f0f0"
      }}>
        <h2 style={{ margin: 0, color: "#333", fontSize: "24px" }}>Industry Management</h2>
        <button
          onClick={handleAddRoot}
          style={{
            background: "#007cba",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "12px 24px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0,124,186,0.2)",
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.background = "#0056b3";
            target.style.transform = "translateY(-1px)";
            target.style.boxShadow = "0 4px 8px rgba(0,124,186,0.3)";
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.background = "#007cba";
            target.style.transform = "translateY(0)";
            target.style.boxShadow = "0 2px 4px rgba(0,124,186,0.2)";
          }}
        >
          + Add Industry
        </button>
      </div>

      {/* Main Categories Section */}
      <div style={{
        marginBottom: "30px",
        padding: "20px",
        background: "#f8f9fa",
        borderRadius: "12px",
        border: "2px solid #e9ecef"
      }}>
        <h3 style={{ 
          margin: "0 0 20px 0", 
          color: "#333", 
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <span>📁</span>
          Main Categories
          <span style={{ 
            fontSize: "12px", 
            color: "#666", 
            fontWeight: "normal",
            fontStyle: "italic"
          }}>
            (Click to expand, drag to reorder, × to delete)
          </span>
        </h3>
        
        {orderedMainCategories.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: "#666",
            background: "#fff",
            borderRadius: "8px",
            border: "2px dashed #ddd"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "15px", opacity: 0.3 }}>📂</div>
            <p style={{ marginBottom: "15px" }}>No main categories available.</p>
            <button
              onClick={handleAddRoot}
              style={{
                background: "#007cba",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold"
              }}
            >
              Create First Category
            </button>
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "flex-start"
          }}>
            {orderedMainCategories.map((category, index) => (
              <MainCategoryBlock
                key={category.id}
                category={category}
                isSelected={selectedCategories.some(sc => sc.id === category.id)}
                onClick={handleCategorySelect}
                onDragOver={(e) => handleMainCategoryDragOver(e, index)}
                onDragLeave={handleMainCategoryDragLeave}
                onDrop={(e) => handleMainCategoryDrop(e, index)}
                onRename={handleRename} 
                onDelete={handleMainCategoryDelete}
                dragOver={dragOverIndex === index}
                position={selectedCategories.findIndex(sc => sc.id === category.id) + 1 || null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comparison Panes Section */}
      {selectedCategories.length > 0 && (
        <div style={{
          marginBottom: "30px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}>
            <h3 style={{ 
              margin: 0, 
              color: "#333", 
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span>🔍</span>
              Category Comparison ({selectedCategories.length})
              <span style={{ 
                fontSize: "12px", 
                color: "#666", 
                fontWeight: "normal",
                fontStyle: "italic"
              }}>
                (Drag items between panes to move, + to add children directly)
              </span>
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleGlobalExpandCollapseAll}
                style={{
                  background: "#007cba",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = "#0056b3";
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = "#007cba";
                }}
              >
                {isAnyNodeExpanded() ? "Collapse All" : "Expand All"}
              </button>
              <button
                onClick={() => {
                  // Clear all scroll refs and expanded nodes when clearing all panes
                  paneScrollRefs.current.clear();
                  paneScrollPositions.current.clear();
                  setExpandedNodes(new Map());
                  setGlobalExpandState(false);
                  setSelectedCategories([]);
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: selectedCategories.length === 1 ? "1fr" : 
                               selectedCategories.length === 2 ? "1fr 1fr" : 
                               "repeat(3, 1fr)",
            gap: "15px"
          }}>
            {selectedCategories.map((category, index) => {
              const categoryTree = getTreeForCategory(category.id);
              
              return (
                <ComparisonPane
                  key={category.id}
                  category={category}
                  position={index + 1}
                  onClose={() => {
                    // Clean up scroll ref and expanded nodes for this pane
                    paneScrollRefs.current.delete(category.id);
                    paneScrollPositions.current.delete(category.id);
                    setExpandedNodes(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(category.id);
                      return newMap;
                    });
                    setSelectedCategories(prev => 
                      prev.filter(sc => sc.id !== category.id)
                    );
                  }}
                  tree={categoryTree}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onAddChild={handleAddChild}
                  onMoveToRoot={handleMoveToRoot}
                  onMoveToParent={handleMoveToParent}
                  onDropFromOtherPane={handleDropFromOtherPane}
                  paneScrollRef={paneScrollRefs}
                  expandedNodes={expandedNodes.get(category.id) || new Set()}
                  onToggleExpand={(nodeId) => handleToggleExpand(category.id, nodeId)}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: "30px",
        padding: "20px",
        background: "#f8f9fa",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#666"
      }}>
        <strong style={{ color: "#333", fontSize: "14px" }}>Instructions:</strong>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "15px", 
          marginTop: "10px" 
        }}>
          <div>
            <strong>Main Categories:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px", lineHeight: "1.4" }}>
              <li>Click any main category to view its tree</li>
              <li>Drag main categories to reorder them (visual only)</li>
              <li>Double-click to rename categories</li>
              <li>Use × button to delete main categories</li>
              <li>Multiple categories can be selected for comparison</li>
            </ul>
          </div>
          <div>
            <strong>Tree Operations:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px", lineHeight: "1.4" }}>
              <li>Double-click on any industry name to edit it</li>
              <li>Drag and drop industries between comparison panes</li>
              <li>Drag children from one main category to another</li>
              <li>Use <strong>+</strong> button in header to add children directly to main category</li>
              <li>Use <strong>+</strong> button on items to add child industries</li>
              <li>Use <strong>↑</strong> button to move sub-industries to root level</li>
              <li>Use <strong>×</strong> button to delete industries</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InputModal
        isOpen={inputModal.isOpen}
        title={inputModal.title}
        placeholder={inputModal.placeholder}
        onConfirm={inputModal.onConfirm}
        onCancel={() => setInputModal({ ...inputModal, isOpen: false })}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default IndustryTree;