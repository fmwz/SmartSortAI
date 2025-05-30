// App.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as tmImage from '@teachablemachine/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ClipLoader from 'react-spinners/ClipLoader';
import './App.css';
import bg from './assets/background.jpg';

const ORIGINAL_PLATE_POS = { x: 10, y: 80 };

function App() {
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState(null);
  const [classified, setClassified] = useState({});
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [modelStatus, setModelStatus] = useState('loading');

  // Plate states
  const [plateFolders, setPlateFolders] = useState([]);
  const [plateImages, setPlateImages] = useState([]);
  const [isDraggingPlate, setIsDraggingPlate] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [platePosition, setPlatePosition] = useState(ORIGINAL_PLATE_POS);
  const [poofing, setPoofing] = useState(false);
  const [isPlateOpen, setIsPlateOpen] = useState(false);
  const plateRef = useRef(null);

  // Load model
  useEffect(() => {
    (async () => {
      try {
        const loadedModel = await tmImage.load(
          'https://teachablemachine.withgoogle.com/models/bh5xejCeg/model.json',
          'https://teachablemachine.withgoogle.com/models/bh5xejCeg/metadata.json'
        );
        setModel(loadedModel);
        setModelStatus('loaded');
      } catch {
        setModelStatus('failed');
      }
    })();
  }, []);

  // Parallax effect
  useEffect(() => {
    if (showThumbnails) return;
    const handleParallax = (e) => {
      setMousePosition({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleParallax);
    return () => window.removeEventListener('mousemove', handleParallax);
  }, [showThumbnails]);

  // Plate drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingPlate) {
        setPlatePosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
    };
    const handleMouseUp = (e) => {
      if (!isDraggingPlate) return;
      setIsDraggingPlate(false);
      const dz = document.getElementById('dropzone-root');
      if (!dz) return;
      const rect = dz.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (inside) setPoofing(true);
      else setPlatePosition(ORIGINAL_PLATE_POS);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlate, dragOffset]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const imageFiles = acceptedFiles.filter((f) => f.type.startsWith('image/'));
      setFiles(imageFiles);
      setShowThumbnails(false);
      if (!model) return;
      setLoading(true);
      const results = {};
      for (const file of imageFiles) {
        try {
          const img = await fileToImage(file);
          const preds = await model.predict(img);
          const top = preds.reduce((p, c) => (c.probability > p.probability ? c : p));
          const label = top.className;
          results[label] = results[label] || [];
          results[label].push(file);
        } catch {}
      }
      setClassified(results);
      setLoading(false);
    },
    [model]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onDrop(files),
    accept: { 'image/*': [] },
    multiple: true,
  });

  const [plateHidden, setPlateHidden] = useState(false);


  const { getRootProps: getPlateRootProps, getInputProps: getPlateInputProps } = useDropzone({
    onDrop: (files) => addFolderToPlate(files),
    noClick: true,
    noKeyboard: true,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const addFolderToPlate = (fileList) => {
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setPlateFolders((prev) => [...prev, imageFiles]);
    setPlateImages((prev) => [...prev, ...imageFiles]);
  };

  const downloadGroup = async (label, groupFiles) => {
    const zip = new JSZip();
    groupFiles.forEach((f) => zip.file(f.name, f));
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${label}.zip`);
  };

  const handlePoofEnd = () => {
    setPoofing(false);
    onDrop(plateImages);
    setPlateFolders([]);
    setPlateImages([]);
    setPlatePosition(ORIGINAL_PLATE_POS);
  };

  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),url(${bg})`,
    backgroundSize: `${
      120 + Math.max(Object.keys(classified).length - 3, 0) * 35
    }%`,
    backgroundPosition: showThumbnails
      ? '50% 50%'
      : `${50 + (mousePosition.x - 0.5) * 30}% ${50 + (mousePosition.y - 0.5) * 30}%`,
    transition: 'background-position 0.3s ease-out',
  };

  const renderModelStatus = () => {
    let text = '',
      color = '';
    if (modelStatus === 'loading') [text, color] = ['Loading model…', 'text-yellow-300'];
    if (modelStatus === 'loaded') [text, color] = ['Model loaded ✅', 'text-green-400'];
    if (modelStatus === 'failed') [text, color] = ['Model failed ❌', 'text-red-500'];
    return (
      <div className={`fixed top-4 right-4 text-sm font-semibold ${color} bg-black/50 px-3 py-1 rounded-lg shadow-lg select-none z-50`}>
        {text}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white font-sans flex flex-col items-center justify-start p-8" style={backgroundStyle}>
      {renderModelStatus()}

      <button
        onClick={() => setIsPlateOpen((o) => !o)}
        className="fixed left-2 top-2 z-50 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-br-xl shadow-md transition"
      >
        {isPlateOpen ? 'Hide Plate' : 'Show Plate'}
      </button>

      <div
        {...getPlateRootProps()}
        ref={plateRef}
        className={`plate-panel ${poofing ? 'poof' : ''}`}
        style={{
          left: platePosition.x,
          top: platePosition.y,
          transform: isPlateOpen ? 'translateX(0)' : 'translateX(-120%)',
          opacity: isPlateOpen ? 1 : 0,
          pointerEvents: isPlateOpen ? 'auto' : 'none',
          cursor: plateFolders.length ? (isDraggingPlate ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={(e) => {
          if (!plateFolders.length || poofing) return;
          const rect = plateRef.current.getBoundingClientRect();
          setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setIsDraggingPlate(true);
        }}
        onAnimationEnd={poofing ? handlePoofEnd : undefined}
      >
        <input {...getPlateInputProps()} style={{ display: 'none' }} />
        <h3>📂 Plate:</h3>
        {!plateFolders.length && <p>No folders added</p>}
        <ul>
          {plateFolders.map((arr, i) => (
            <li key={i}>
              Folder {i + 1}: {arr.length} images
            </li>
          ))}
        </ul>
        <button
          onClick={() => document.getElementById('plateFolderInput').click()}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg mt-4 w-full"
        >
          Add Folder to Plate
        </button>
        <button
          onClick={() => {
            setPlateFolders([]);
            setPlateImages([]);
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg mt-2 w-full"
        >
          Clear Plate
        </button>
      </div>

      <input
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        id="plateFolderInput"
        onChange={(e) => {
          addFolderToPlate(e.target.files);
          e.target.value = null;
        }}
      />

      <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 text-center drop-shadow-lg">
        SmartSort (AI file sorter)
      </h1>
      <p className="text-xl sm:text-2xl mb-6 text-center font-medium">
        Drop a folder of images and let AI organize them for you
      </p>

      <div
        {...getRootProps()}
        id="dropzone-root"
        onDragOver={(e) => e.preventDefault()}
        className={`dropzone border-4 border-dashed rounded-2xl p-10 w-full max-w-3xl text-center cursor-pointer transition ${
          isDragActive ? 'bg-white/20 border-blue-300' : 'bg-white/10 border-white/40'
        } hover:bg-white/20`}
      >
        <input {...getInputProps()} webkitdirectory="true" directory="true" />
        <p className="text-lg sm:text-xl font-medium">
          {isDragActive ? 'Drop the files here...' : 'Drag & drop images here, or click to select a folder'}
        </p>
      </div>

      {loading && (
        <div className="mt-8 flex items-center space-x-3 text-blue-200">
          <ClipLoader size={24} color="#93c5fd" />
          <p className="text-lg animate-pulse">Sorting files with AI...</p>
        </div>
      )}

      {!loading && Object.keys(classified).length > 0 && (
        <div className="w-full max-w-4xl mt-10 space-y-8">
          <div className="text-center">
            <button
              onClick={() => setShowThumbnails((p) => !p)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              {showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
            </button>
          </div>
          <h2 className="text-3xl font-bold text-center mt-4">📂 Sorted Files:</h2>
          {Object.entries(classified).map(([label, group], idx) => (
            <div key={idx} className="bg-white/20 shadow-xl rounded-xl p-6 text-white">
              <h3 className="text-2xl font-semibold mb-2">{label}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {group.map((file, i) => (
                  <li key={i} className="bg-white/30 rounded-lg p-2 text-sm truncate">
                    <p>{file.name}</p>
                    {showThumbnails && (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded mt-1"
                      />
                    )}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => downloadGroup(label, group)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Download "{label}" Folder
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const fileToImage = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Image failed to load'));
    };
    reader.onerror = () => rej(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });

export default App;
