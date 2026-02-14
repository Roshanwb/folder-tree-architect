import React, { useState } from 'react';
import { Folder, FileText, Check, FolderOpen, Upload, Download } from 'lucide-react';

// --- Logic: Build Tree from Path Strings ---
// Converts "folder/sub/file.txt" into a nested object structure
const buildTree = (fileList) => {
    const root = { name: "root", type: "folder", children: {}, isChecked: true, isOpen: true };

    Array.from(fileList).forEach(file => {
        const parts = file.webkitRelativePath.split('/');
        let current = root;

        parts.forEach((part, index) => {
            if (!current.children[part]) {
                const isFile = index === parts.length - 1;
                current.children[part] = {
                    name: part,
                    type: isFile ? "file" : "folder",
                    children: {},
                    isChecked: true,
                    isOpen: true 
                };
            }
            current = current.children[part];
        });
    });
    return root;
};

// --- Recursive Component: TreeNode ---
const TreeNode = ({ node, path, onToggleCheck, onToggleOpen }) => {
    if (!node) return null;
    
    // Sort: Folders first, then files
    const childrenKeys = Object.keys(node.children).sort((a, b) => {
        const typeA = node.children[a].type;
        const typeB = node.children[b].type;
        if (typeA === typeB) return a.localeCompare(b);
        return typeA === 'folder' ? -1 : 1;
    });

    const handleCheck = (e) => {
        e.stopPropagation();
        onToggleCheck(path, !node.isChecked);
    };

    return (
        <div className="ml-4 select-none">
            <div className="flex items-center gap-2 py-1 group hover:bg-slate-800 rounded px-2 transition-colors">
                
                {/* Checkbox */}
                <div 
                    onClick={handleCheck}
                    className={`w-4 h-4 border rounded cursor-pointer flex items-center justify-center transition-colors ${node.isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-500 hover:border-slate-300'}`}
                >
                    {node.isChecked && <Check size={12} strokeWidth={4} className="text-white" />}
                </div>

                {/* Expand/Collapse for folders */}
                <div 
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => onToggleOpen(path)}
                >
                    {node.type === 'folder' ? (
                        node.isOpen ? <FolderOpen size={18} className="text-blue-400" /> : <Folder size={18} className="text-blue-400" />
                    ) : (
                        <FileText size={18} className="text-slate-400" />
                    )}
                    <span className={`${node.isChecked ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                        {node.name}
                    </span>
                </div>
            </div>

            {/* Render Children if open and exists */}
            {node.type === 'folder' && node.isOpen && (
                <div className="border-l border-slate-700 ml-2">
                    {childrenKeys.map(key => (
                        <TreeNode 
                            key={key} 
                            node={node.children[key]} 
                            path={[...path, key]} 
                            onToggleCheck={onToggleCheck}
                            onToggleOpen={onToggleOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Application ---
export default function App() {
    const [tree, setTree] = useState(null);
    const [rootName, setRootName] = useState("Project");

    // 1. Handle File Selection
    const handleFileUpload = (e) => {
        if (e.target.files.length > 0) {
            const newTree = buildTree(e.target.files);
            // The first folder name is usually the root folder name
            const firstFile = e.target.files[0].webkitRelativePath;
            const rootDir = firstFile.split('/')[0];
            setRootName(rootDir);
            
            // We skip the abstract "root" and go straight to the actual folder selected
            setTree(newTree.children[rootDir]); 
        }
    };

    // 2. Toggle Selection State Recursively
    const toggleCheck = (path, status) => {
        const newTree = JSON.parse(JSON.stringify(tree)); // Deep copy
        
        // Helper to find node
        let current = newTree;
        // If path is empty, we are at root
        if(path.length > 0) {
                for (let key of path) {
                current = current.children[key];
            }
        }

        // Recursive function to set status for all children
        const setRecursive = (node, val) => {
            node.isChecked = val;
            Object.keys(node.children).forEach(key => {
                setRecursive(node.children[key], val);
            });
        };

        setRecursive(current, status);
        setTree(newTree);
    };

    // 3. Toggle Open/Close
    const toggleOpen = (path) => {
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;
        if(path.length > 0) {
                for (let key of path) {
                current = current.children[key];
            }
        }
        current.isOpen = !current.isOpen;
        setTree(newTree);
    };

    // 4. Generation Functions
    const generateText = (node, prefix = "", isLast = true) => {
        if (!node || !node.isChecked) return "";
        
        let result = "";
        
        const children = Object.values(node.children).filter(c => c.isChecked);
        children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));

        children.forEach((child, index) => {
            const childIsLast = index === children.length - 1;
            const connector = childIsLast ? "└── " : "├── ";
            result += `${prefix}${connector}${child.name}\n`;
            if (child.type === 'folder') {
                result += generateText(child, prefix + (childIsLast ? "    " : "│   "), true); // Recurse
            }
        });
        return result;
    };

    const downloadText = () => {
        const text = `${rootName}\n${generateText(tree)}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${rootName}_structure.txt`;
        a.click();
    };
    
    const downloadSVG = () => {
            // Simple SVG generation logic mimicking the text structure
        const lineHeight = 20;
        const charWidth = 8;
        const textLines = (`${rootName}\n${generateText(tree)}`).split('\n');
        const width = Math.max(...textLines.map(l => l.length)) * charWidth + 20;
        const height = textLines.length * lineHeight + 20;

        const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background-color: white; font-family: monospace;">
                <rect width="100%" height="100%" fill="white"/>
                <text x="10" y="20" font-family="monospace" font-size="14" fill="black">
                    ${textLines.map((line, i) => `<tspan x="10" dy="${i===0?0:lineHeight}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('')}
                </text>
            </svg>
        `;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${rootName}_structure.svg`;
        a.click();
    };

    return (
        <div className="min-h-screen p-8 flex flex-col items-center bg-[#0f172a] text-[#e2e8f0] font-sans overflow-y-auto">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                    Folder Tree Architect
                </h1>
                <p className="text-slate-400">Select a folder, customize visibility, and export.</p>
            </header>

            {/* Controls */}
            <div className="w-full max-w-2xl bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 mb-6">
                {!tree ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 transition-colors group relative cursor-pointer">
                        <Upload size={48} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <p className="mt-4 text-lg font-medium">Click here to select a folder</p>
                        <input 
                            type="file" 
                            {...{ webkitdirectory: "", directory: "", multiple: true }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                        />
                    </div>
                ) : (
                    <div className="flex gap-4 justify-between items-center flex-wrap">
                        <button onClick={() => setTree(null)} className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
                            ← Choose Different Folder
                        </button>
                        <div className="flex gap-2">
                            <button onClick={downloadText} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium shadow-lg transition-all flex items-center gap-2">
                                <Download size={16} />
                                Text
                            </button>
                            <button onClick={downloadSVG} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium shadow-lg transition-all flex items-center gap-2">
                                <Download size={16} />
                                SVG
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tree Display */}
            {tree && (
                <div className="w-full max-w-2xl bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4 text-blue-300 border-b border-slate-700 pb-2">
                        {rootName}
                    </h2>
                    <div className="font-mono text-sm">
                        <TreeNode 
                            node={tree} 
                            path={[]} 
                            onToggleCheck={toggleCheck} 
                            onToggleOpen={toggleOpen}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}