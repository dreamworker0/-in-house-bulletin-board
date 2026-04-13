import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDocFromServer, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Auth } from './components/Auth';
import { PostList } from './components/PostList';
import { PostDetail } from './components/PostDetail';
import { CreatePost } from './components/CreatePost';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Post } from './types';
import { Plus, Users } from 'lucide-react';

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSelectPost = (post: Post) => {
    setSelectedPost(post);
    setCurrentView('detail');
  };

  const handleCreatePost = () => {
    setSelectedPost(null);
    setCurrentView('create');
  };

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setSelectedPost(null);
    setCurrentView('list');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleBackToList}
          >
            <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:bg-blue-700 transition-colors shadow-sm">
              <Users size={20} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">사내 게시판</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && currentView === 'list' && (
              <button
                onClick={handleCreatePost}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
              >
                <Plus size={16} />
                새 글 작성
              </button>
            )}
            <Auth user={user} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-in fade-in duration-300">
          {!user ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-12">
              <Users size={48} className="mx-auto text-blue-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">로그인이 필요합니다</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                사내 게시판을 이용하려면 먼저 로그인해 주세요.
              </p>
              <div className="flex justify-center">
                <Auth user={user} />
              </div>
            </div>
          ) : (
            <>
              {currentView === 'list' && <PostList onSelectPost={handleSelectPost} />}
              {currentView === 'detail' && selectedPost && (
                <PostDetail 
                  postId={selectedPost.id} 
                  onBack={handleBackToList} 
                  onEdit={handleEditPost} 
                />
              )}
              {currentView === 'create' && <CreatePost onBack={handleBackToList} />}
              {currentView === 'edit' && selectedPost && (
                <CreatePost onBack={handleBackToList} editPost={selectedPost} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
