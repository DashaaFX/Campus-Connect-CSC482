import React from 'react'
import Navbar from '../components_lite/Navbar'
import dash from './dash.jpg';
import balj from './balj.jpg';

const Creator = () => {
  return (
    <div>
      
      <div className="flex flex-col items-center justify-center min-h-screen max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-12">Our Team</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
          {/* Creator 1 */}
          <div className="flex flex-col items-center p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <img 
              src={dash} 
              alt="Creator 1" 
              className="w-64 h-64 object-cover rounded-full mb-6 border-4 border-blue-100"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashnyam Puntsagnorov</h2>
            <p className="text-gray-600 mb-1">Frontend Developer</p>
            <p className="text-gray-600 mb-4">Team Leader</p>
            
            <div className="text-left text-gray-700">
              <p className="mb-2"><strong>Education:</strong> [Degree] from [Institution]</p>
              <p className="mb-2"><strong>Specialization:</strong> [Area of expertise]</p>
              <p className="mb-2"><strong>Experience:</strong> [Years] years in [Field]</p>
              <p className="mb-2"><strong>Contributions:</strong> Frontend</p>
              <p><strong>Contact:</strong> [dadhaap@gmail.com]</p>
            </div>
          </div>
          
          {/* Creator 2 */}
          <div className="flex flex-col items-center p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <img 
              src={balj} 
              alt="Creator 2" 
              className="w-64 h-64 object-cover rounded-full mb-6 border-4 border-blue-100"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Baljinnyam Puntsagnorov</h2>
            <p className="text-gray-600 mb-1">Backend Developer</p>
            <p className="text-gray-600 mb-4">SideKick</p>
            
            <div className="text-left text-gray-700">
              <p className="mb-2"><strong>Education:</strong> [Degree] from [Institution]</p>
              <p className="mb-2"><strong>Specialization:</strong> [Area of expertise]</p>
              <p className="mb-2"><strong>Experience:</strong> [Years] years in [Field]</p>
              <p className="mb-2"><strong>Contributions:</strong> Backend</p>
              <p><strong>Contact:</strong> [baljaa367@gmail.com]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Creator