import React, { useEffect, useState } from "react";
import API_BASE_URL from '../config/api'; // Adjust path as needed

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
}

interface MainCategoryBlockProps {
  category: Industry;
  isSelected: boolean;
  onClick: (category: Industry) => void;
  onDragOver: (e: React.DragEvent) => void;
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
}

interface TreeRecursiveProps {
  nodes: Industry[];
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onAddChild: (parentId: number) => void;
  onMoveToRoot: (id: number) => void;
  onMoveToParent: (childId: number, newParentId: number) => void;
  level?: number;
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

// ----------- Draggable Block ----------
const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  node, 
  onDelete, 
  onRename, 
  onAddChild, 
  onMoveToRoot, 
  onMoveToParent, 
  children, 
  level = 0 
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.industry_name);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const style: React.CSSProperties = {
    padding: "12px",
    margin: "4px 0",
    border: isDragging ? "2px dashed #007cba" : dragOver ? "2px solid #007cba" : "1px solid #ddd",
    borderRadius: "8px",
    background: isDragging ? "#f0f8ff" : dragOver ? "#e6f3ff" : level === 0 ? "#fff" : "#f9f9f9",
    marginLeft: `${level * 20}px`,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging ? "0 8px 25px rgba(0,0,0,0.2)" : dragOver ? "0 4px 15px rgba(0,124,186,0.2)" : "0 2px 4px rgba(0,0,0,0.1)",
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
              <strong
                onDoubleClick={() => setEditing(true)}
                style={{
                  cursor: "text",
                  padding: "4px 0",
                  fontSize: "14px",
                  color: level === 0 ? "#333" : "#555",
                  userSelect: "none",
                  transition: "color 0.2s ease",
                  display: "block"
                }}
                title="Double-click to edit"
              >
                {name}
              </strong>
              <small
                style={{
                  color: "#888",
                  fontSize: "11px",
                  fontStyle: "italic",
                  marginTop: "2px"
                }}
              >
                {node.category}
              </small>
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
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
                borderRadius: "4px",
                padding: "6px 8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(40,167,69,0.2)",
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
              borderRadius: "4px",
              padding: "6px 8px",
              cursor: "pointer",
              fontSize: "12px",
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
              borderRadius: "4px",
              padding: "6px 8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(220,53,69,0.2)",
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
      
      {children && (
        <div 
          style={{ marginTop: "10px" }}
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
  dragOver, 
  position 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.industry_name);

  const handleSave = () => {
    if (name.trim() && name !== category.industry_name) {
      // This would call rename function from parent
      // onRename(category.id, name.trim());
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
        padding: "16px 20px",
        margin: "8px",
        border: isSelected ? "3px solid #007cba" : dragOver ? "2px dashed #007cba" : "2px solid #e0e0e0",
        borderRadius: "12px",
        background: isDragging ? "#f0f8ff" : isSelected ? "#e6f3ff" : dragOver ? "#f0f8ff" : "#fff",
        cursor: editing ? "text" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "0 6px 20px rgba(0,124,186,0.3)" : dragOver ? "0 4px 15px rgba(0,124,186,0.2)" : "0 2px 8px rgba(0,0,0,0.1)",
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
        minWidth: "120px",
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
              fontSize: "16px",
              fontWeight: "600",
              color: isSelected ? "#007cba" : "#333",
              marginBottom: "4px"
            }}
          >
            {category.industry_name}
          </div>
          <div style={{
            fontSize: "12px",
            color: "#888",
            fontStyle: "italic"
          }}>
            Main Category
          </div>
        </div>
      )}
      
      {/* Delete button for main category */}
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
  onDropFromOtherPane 
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
      {/* Pane Header */}
      <div style={{
        background: dragOver ? "#28a745" : "#007cba",
        color: "white",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
            {category.industry_name}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            Position #{position}
          </div>
        </div>
        
        {/* Add Child Button in Header */}
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
            borderRadius: "4px",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            marginRight: "8px",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px"
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
          <span style={{ fontSize: "16px" }}>+</span>
          <span style={{ fontSize: "11px" }}>Add</span>
        </button>
        
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "4px",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          ✕
        </button>
      </div>
      
      {/* Drop Zone Indicator */}
      {dragOver && (
        <div style={{
          background: "#f0fff0",
          border: "2px dashed #28a745",
          margin: "8px",
          padding: "12px",
          borderRadius: "8px",
          textAlign: "center",
          color: "#28a745",
          fontSize: "14px",
          fontWeight: "bold"
        }}>
          Drop here to move to {category.industry_name}
        </div>
      )}
      
      {/* Pane Content */}
      <div style={{
        padding: "16px",
        maxHeight: "400px",
        overflowY: "auto"
      }}>
        {tree.length > 0 && tree[0].children && tree[0].children.length > 0 ? (
          <TreeRecursive
            nodes={tree[0].children}
            onDelete={onDelete}
            onRename={onRename}
            onAddChild={onAddChild}
            onMoveToRoot={onMoveToRoot}
            onMoveToParent={onMoveToParent}
            level={1}
          />
        ) : (
          <div style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "#666",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "2px dashed #ddd"
          }}>
            <div style={{ fontSize: "24px", marginBottom: "10px", opacity: 0.3 }}>📝</div>
            <p style={{ marginBottom: "15px", fontSize: "14px" }}>No subcategories yet</p>
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

  useEffect(() => {
    loadIndustries();
  }, [selectedIndustryId]);

  const loadIndustries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/industries/`);
      if (!response.ok) throw new Error('Failed to fetch industries');
      const data: Industry[] = await response.json();
      setIndustries(data);
      const treeData = buildTree(data);
      setTree(treeData);
      
      // Extract main categories
      const mains = data.filter(item => item.parent_id === null);
      setMainCategories(mains);
      setMainCategoriesOrder(mains.map(item => item.id));
    } catch (error) {
      console.error("Failed to load industries:", error);
      // Enhanced mock data for better testing
      const mockData: Industry[] = [
        { id: 1, industry_name: "Sports", category: "main", parent_id: null },
        { id: 2, industry_name: "Beauty", category: "main", parent_id: null },
        { id: 3, industry_name: "Cricket", category: "sub", parent_id: 1 },
        { id: 4, industry_name: "Football", category: "sub", parent_id: 1 },
        { id: 5, industry_name: "Basketball", category: "sub", parent_id: 1 },
        { id: 6, industry_name: "Rugby", category: "sub", parent_id: 1 },
        { id: 7, industry_name: "Bat", category: "sub", parent_id: 3 },
        { id: 8, industry_name: "Ball", category: "sub", parent_id: 3 },
        { id: 9, industry_name: "Cosmetics", category: "main", parent_id: null },
        { id: 10, industry_name: "Skincare", category: "sub", parent_id: 2 },
        { id: 11, industry_name: "Gym", category: "main", parent_id: null },
        { id: 12, industry_name: "Stadium", category: "main", parent_id: null },
        { id: 13, industry_name: "Salon", category: "main", parent_id: null },
      ];
      setIndustries(mockData);
      const treeData = buildTree(mockData);
      setTree(treeData);
      
      // Extract main categories
      const mains = mockData.filter(item => item.parent_id === null);
      setMainCategories(mains);
      setMainCategoriesOrder(mains.map(item => item.id));
    }
    setLoading(false);
  };

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
      // Remove from selection
      setSelectedCategories(prev => prev.filter(sc => sc.id !== category.id));
    } else {
      // Add to selection
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
        // Reorder main categories (just visual, no database update)
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

  // Get the tree for a specific main category
  const getTreeForCategory = (categoryId: number): Industry[] => {
    const categoryNode = findNodeById(tree, categoryId);
    return categoryNode ? [categoryNode] : [];
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this industry and all its children?")) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/industries/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error('Delete failed');
      await loadIndustries();
      
      // Remove from selected categories if it was a main category
      setSelectedCategories(prev => prev.filter(sc => sc.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete industry. Please try again.");
    }
  };

  const handleMainCategoryDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this main category and all its subcategories?")) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/industries/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error('Delete failed');
      await loadIndustries();
      
      // Remove from selected categories
      setSelectedCategories(prev => prev.filter(sc => sc.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete main category. Please try again.");
    }
  };

  const handleRename = async (id: number, name: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/industries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry_name: name }),
      });
      if (!response.ok) throw new Error('Rename failed');
      await loadIndustries();
    } catch (error) {
      console.error("Rename failed:", error);
      alert("Failed to rename industry. Please try again.");
    }
  };

  const handleAddChild = async (parentId: number) => {
    const name = prompt("Enter child industry name:");
    if (!name || !name.trim()) return;
    
    const parentLevel = getNodeLevel(tree, parentId);
    const childCategory = getCategoryByLevel(parentLevel + 1);
    
    try {
      const response = await fetch(`${API_BASE_URL}/industries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_name: name.trim(),
          category: childCategory,
          parent_id: parentId,
        }),
      });
      if (!response.ok) throw new Error('Add child failed');
      await loadIndustries();
    } catch (error) {
      console.error("Add child failed:", error);
      alert("Failed to add child industry. Please try again.");
    }
  };

  const handleMoveToRoot = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/update-industry-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: id, 
          new_parent_id: null,
          new_category: "Main Industry"
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Move to root failed');
      }
      await loadIndustries();
    } catch (error) {
      console.error("Move to root failed:", error);
      alert(`Failed to move industry to root: ${(error as Error).message}`);
    }
  };

  const handleMoveToParent = async (childId: number, newParentId: number) => {
    try {
      const newParentLevel = getNodeLevel(tree, newParentId);
      const newCategory = getCategoryByLevel(newParentLevel + 1);
      
      const response = await fetch(`${API_BASE_URL}/update-industry-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: childId, 
          new_parent_id: newParentId,
          new_category: newCategory
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Move failed');
      }
      await loadIndustries();
    } catch (error) {
      console.error("Move to parent failed:", error);
      alert(`Failed to move industry: ${(error as Error).message}`);
    }
  };

  // Handle moving child from one main category to another
  const handleDropFromOtherPane = async (childId: number, newMainCategoryId: number) => {
    if (!window.confirm("Move this item to another main category?")) {
      return;
    }
    
    try {
      const newCategory = getCategoryByLevel(1); // First level under main category
      
      const response = await fetch(`${API_BASE_URL}/update-industry-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: childId, 
          new_parent_id: newMainCategoryId,
          new_category: newCategory
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Move between categories failed');
      }
      await loadIndustries();
    } catch (error) {
      console.error("Move between categories failed:", error);
      alert(`Failed to move industry between categories: ${(error as Error).message}`);
    }
  };

  const handleAddRoot = async () => {
    const name = prompt("Enter industry name:");
    if (!name || !name.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/industries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_name: name.trim(),
          category: "main",
          parent_id: null,
        }),
      });
      if (!response.ok) throw new Error('Add industry failed');
      await loadIndustries();
    } catch (error) {
      console.error("Add industry failed:", error);
      alert("Failed to add industry. Please try again.");
    }
  };

  // Order main categories according to the current order
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
    <div style={{
      marginTop: "20px",
      fontFamily: "Arial, sans-serif",
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "20px"
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
            <button
              onClick={() => setSelectedCategories([])}
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
          
          <div style={{
            display: "grid",
            gridTemplateColumns: selectedCategories.length === 1 ? "1fr" : 
                               selectedCategories.length === 2 ? "1fr 1fr" : 
                               "repeat(3, 1fr)",
            gap: "20px",
            maxHeight: "600px",
            overflowY: "auto"
          }}>
            {selectedCategories.map((category, index) => {
              const categoryTree = getTreeForCategory(category.id);
              
              return (
                <ComparisonPane
                  key={category.id}
                  category={category}
                  position={index + 1}
                  onClose={() => setSelectedCategories(prev => 
                    prev.filter(sc => sc.id !== category.id)
                  )}
                  tree={categoryTree}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onAddChild={handleAddChild}
                  onMoveToRoot={handleMoveToRoot}
                  onMoveToParent={handleMoveToParent}
                  onDropFromOtherPane={handleDropFromOtherPane}
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
    </div>
  );
};

export default IndustryTree;