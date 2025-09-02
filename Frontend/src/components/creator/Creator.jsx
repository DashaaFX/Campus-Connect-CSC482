import React from 'react'
import Navbar from '../components_lite/Navbar'
import dash from './dash.jpg';
import balj from './balj.jpg';

const Creator = () => {
  return (
    <div>
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6 mx-auto max-w-7xl">
        <h1 className="mb-12 text-3xl font-bold text-gray-800">Our Team</h1>
        
        <div className="grid w-full grid-cols-1 gap-12 md:grid-cols-2">
          {/* Creator 1 */}
          <div className="flex flex-col items-center p-6 transition-shadow duration-300 rounded-lg shadow-md hover:shadow-lg">
            <img 
              src={dash} 
              alt="Creator 1" 
              className="object-cover w-64 h-64 mb-6 border-4 border-blue-100 rounded-full"
            />
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Dashnyam Puntsagnorov</h2>
            <p className="mb-1 text-gray-600">Frontend Developer</p>
            <p className="mb-4 text-gray-600">Team Leader</p>
            
            <div className="text-left text-gray-700">
              <p className="mb-2"><strong>Education:</strong> [Degree] from [Institution]</p>
              <p className="mb-2"><strong>Specialization:</strong> [Area of expertise]</p>
              <p className="mb-2"><strong>Experience:</strong> [Years] years in [Field]</p>
              <p className="mb-2"><strong>Contributions:</strong> Frontend</p>
              <p><strong>Contact:</strong> [dadhaap@gmail.com]</p>
            </div>
          </div>
          
          {/* Creator 2 */}
          <div className="flex flex-col items-center p-6 transition-shadow duration-300 rounded-lg shadow-md hover:shadow-lg">
            <img 
              src={dash} 
              alt="Creator 2" 
              className="object-cover w-64 h-64 mb-6 border-4 border-blue-100 rounded-full"
            />
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Baljinnyam Puntsagnorov</h2>
            <p className="mb-1 text-gray-600">Backend Developer</p>
            <p className="mb-4 text-gray-600">SideKick</p>
            
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