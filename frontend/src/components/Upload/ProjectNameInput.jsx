import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadAPI } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectNameInput = ({ onProjectCreated, onCancel }) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate project name
  const validateProjectName = (name) => {
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 50 && /^[a-zA-Z0-9\s\-_]+$/.test(trimmed);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setProjectName(value);
    setIsValid(validateProjectName(value));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error('Please enter a valid project name (2-50 characters, letters, numbers, spaces, hyphens, and underscores only)');
      return;
    }

    try {
      setIsCreating(true);
      
      // Create project in backend
      const response = await uploadAPI.createProject({
        name: projectName.trim(),
        description: `Phygital project: ${projectName.trim()}`
      });

      // Update user with new project
      if (response.data?.data?.user) {
        updateUser(response.data.data.user);
      }

      toast.success(`🎉 Project "${projectName.trim()}" created successfully!`);
      
      // Call the callback with project data
      onProjectCreated({
        id: response.data?.data?.project?.id,
        name: projectName.trim(),
        user: response.data?.data?.user || user
      });

    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-mesh flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-button-gradient mb-6 shadow-glow-purple">
            <FolderPlus className="w-10 h-10 text-slate-100" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            🚀 Start Your Project
          </h1>
          <p className="text-slate-300">
            Give your Phygital creation a name to get started
          </p>
        </div>

        {/* Project Name Form */}
        <div className="card-glass rounded-2xl shadow-dark-large p-8 border border-slate-600/30">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="projectName" className="block text-sm font-semibold text-slate-300 mb-2">
                Project Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={handleInputChange}
                  placeholder="e.g., My Awesome Design, Brand Campaign 2024"
                  className={`input w-full px-4 py-3 text-lg font-medium transition-all duration-200 ${
                    projectName && isValid
                      ? 'border-neon-green bg-green-900/20'
                      : projectName && !isValid
                      ? 'border-neon-red bg-red-900/20'
                      : ''
                  }`}
                  maxLength={50}
                  autoFocus
                />
                {projectName && isValid && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="w-6 h-6 text-neon-green" />
                  </div>
                )}
              </div>
              
              {/* Character count */}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-400">
                  {projectName.length}/50 characters
                </p>
                {projectName && !isValid && (
                  <p className="text-xs text-neon-red">
                    Invalid project name
                  </p>
                )}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-900/20 border border-neon-blue/30 rounded-lg p-4">
              <h4 className="font-semibold text-neon-blue mb-2">💡 Naming Guidelines</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• 2-50 characters long</li>
                <li>• Use letters, numbers, spaces, hyphens, and underscores</li>
                <li>• Make it descriptive and memorable</li>
                <li>• Examples: "Summer Campaign", "Product_Launch_2024"</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isCreating}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                  isValid && !isCreating
                    ? 'btn-primary shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'text-slate-500 bg-slate-700 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-100 mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Project
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Projects */}
        {user?.projects && user.projects.length > 0 && (
          <div className="mt-8 card-glass rounded-xl shadow-dark-large p-6 border border-slate-600/30">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              📁 Recent Projects
            </h3>
            <div className="space-y-2">
              {user.projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 border border-slate-600/30"
                >
                  <div>
                    <p className="font-medium text-slate-100">{project.name}</p>
                    <p className="text-sm text-slate-400">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to projects page with edit parameter using React Router
                      console.log('🔍 Use button clicked for project:', project.id);
                      navigate(`/projects?edit=${project.id}`);
                    }}
                    className="text-neon-purple hover:text-neon-cyan text-sm font-medium transition-colors"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectNameInput;
