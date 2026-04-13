import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { ArrowLeft, Save, X } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

export function CreatePost({ 
  onBack, 
  editPost = null 
}: { 
  onBack: () => void, 
  editPost?: Post | null 
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
    }
  }, [editPost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('게시글을 작성하려면 로그인해야 합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editPost) {
        // Update existing post
        const postRef = doc(db, 'posts', editPost.id);
        await updateDoc(postRef, {
          title: title.trim(),
          content: content.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new post
        await addDoc(collection(db, 'posts'), {
          title: title.trim(),
          content: content.trim(),
          authorId: currentUser.uid,
          authorName: currentUser.displayName || '익명',
          authorPhoto: currentUser.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          viewCount: 0,
        });
      }
      onBack();
    } catch (err) {
      handleFirestoreError(err, editPost ? OperationType.UPDATE : OperationType.CREATE, 'posts');
      setError('게시글 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900">
          {editPost ? '게시글 수정' : '새 게시글 작성'}
        </h2>
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-200"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="제목을 입력하세요..."
              disabled={loading}
              required
            />
            <div className="mt-1 text-xs text-gray-500 text-right">
              {title.length}/100
            </div>
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              내용
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="게시글 내용을 작성하세요..."
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save size={16} />
              )}
              {editPost ? '변경사항 저장' : '게시글 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
