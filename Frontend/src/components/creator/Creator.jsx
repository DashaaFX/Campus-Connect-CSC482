//About page component - Not polished yet
import React from 'react'
import Navbar from '../components_lite/Navbar'
import dash from './dash.jpg';
import balj from './profile.jpg';

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
            <p className="mb-1 text-gray-600">Full Stack Developer</p>
            
            <div className="text-left text-gray-700">
              <p className="mb-2"><strong>Education:</strong> Bachelor Of Science, Adelphi University</p>
              <p className="mb-2"><strong>Specialization:</strong> Full Stack Engineer</p>
              <p className="mb-2"><strong>Experience:</strong> 1 year in Software Engineer</p>
              <p className="mb-2"><strong>Contributions:</strong> Full Stack</p>
              <p><strong>Contact:</strong> dadhaap@gmail.com</p>
            </div>
          </div>
          
          {/* Creator 2 */}
          <div className="flex flex-col items-center p-6 transition-shadow duration-300 rounded-lg shadow-md hover:shadow-lg">
            <img 
              src={balj} 
              alt="Creator 2" 
              className="object-cover w-64 h-64 mb-6 border-4 border-blue-100 rounded-full"
            />
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Baljinnyam Puntsagnorov</h2>
            <p className="mb-1 text-gray-600">Full Stack Developer</p>
            
            <div className="text-left text-gray-700">
              <p className="mb-2"><strong>Education:</strong> Bachelor of Science from Adelphi University</p>
              <p className="mb-2"><strong>Specialization:</strong> Backend, Frontend, Software Engineer</p>
              <p className="mb-2"><strong>Experience:</strong> 1 year in Full-Stack Software Engineering</p>
              <p className="mb-2"><strong>Contributions:</strong> Full Stack</p>
              <p><strong>Contact:</strong> baljaa367@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Creator
