import React, { useState, useEffect } from 'react';
import { Folder, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Poof from './App.js';

const ORIGINAL_PLATE_POS = { x: 0, y: 0 };

const Plate = ({ plateFolders, setPlateFolders, onDrop, dropZoneRef }) => {
  const [isPlateOpen, setIsPlateOpen] = useState(false);
  const [plateImages, setPlateImages] = useState([]);
  const [platePosition, setPlatePosition] = useState(ORIGINAL_PLATE_POS);
  const [isDragging, setIsDragging] = useState(false);
  const [poofing, setPoofing] = useState(false);
  const [plateFadeOut, setPlateFadeOut] = useState(false); // New state for opacity

  useEffect(() => {
    const allImages = plateFolders.flatMap(folder => folder.images);
    setPlateImages(allImages);
  }, [plateFolders]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const dropZone = dropZoneRef.current;
    const dropZoneRect = dropZone.getBoundingClientRect();
    const plateRect = event.target.getBoundingClientRect();

    const isOverDropZone = !(
      plateRect.right < dropZoneRect.left ||
      plateRect.left > dropZoneRect.right ||
      plateRect.bottom < dropZoneRect.top ||
      plateRect.top > dropZoneRect.bottom
    );

    if (isOverDropZone) {
      setPoofing(true);
    } else {
      setPlatePosition(ORIGINAL_PLATE_POS);
    }
  };

  const handlePoofEnd = () => {
    setPoofing(false);
    setPlateFadeOut(true); // Hide the plate for 3 seconds

    setTimeout(() => {
      setPlateFadeOut(false); // Restore opacity
      onDrop(plateImages);
      setPlateFolders([]);
      setPlateImages([]);
      setPlatePosition(ORIGINAL_PLATE_POS);
    }, 3000);
  };

  const handleClearPlate = () => {
    setPlateFolders([]);
    setPlateImages([]);
    setIsPlateOpen(false);
  };

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">
      {isPlateOpen && (
        <div className="relative w-64 max-h-64 bg-white bg-opacity-80 backdrop-blur-md rounded-xl shadow-lg overflow-y-auto mb-2 p-2">
          <button
            className="absolute top-1 right-1 text-gray-500 hover:text-gray-800"
            onClick={() => setIsPlateOpen(false)}
          >
            <X size={16} />
          </button>
          <div className="text-sm text-gray-700 mb-2">
            {plateFolders.length} folder{plateFolders.length !== 1 ? 's' : ''}, {plateImages.length} image{plateImages.length !== 1 ? 's' : ''}
          </div>
          <ul className="space-y-1">
            {plateFolders.map((folder, index) => (
              <li key={index} className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-gray-800 text-xs truncate">{folder.name}</span>
              </li>
            ))}
          </ul>
          <button
            className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
            onClick={handleClearPlate}
          >
            Clear Plate
          </button>
        </div>
      )}
      <motion.div
        className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-yellow-300 rounded-full shadow-lg cursor-pointer"
        drag
        dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{
          x: platePosition.x,
          y: platePosition.y,
          scale: isDragging ? 1.2 : 1,
          boxShadow: isDragging
            ? '0 0 20px rgba(255, 105, 180, 0.6)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: plateFadeOut ? 0 : (isPlateOpen ? 1 : 0),
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => setIsPlateOpen(!isPlateOpen)}
        style={{
          opacity: plateFadeOut ? 0 : (isPlateOpen ? 1 : 0),
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        {poofing && <Poof onComplete={handlePoofEnd} />}
      </motion.div>
    </div>
  );
};

export default Plate;