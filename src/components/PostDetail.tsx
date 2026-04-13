import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, Edit2, Eye, Clock, User } from 'lucide-react';

export function PostDetail({ postId, onBack, onEdit }: { postId: string, onBack: () => void, onEdit: (post: Post) => void }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const postRef = doc(db, 'posts', postId);
    
    // Increment view count when component mounts
    const incrementViewCount = async () => {
      try {
        await updateDoc(postRef, {
          viewCount: increment(1)
        });
      } catch (error) {
        console.error("Error incrementing view count:", error);
      }
    };
    
    incrementViewCount();

    // Listen to post updates
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as Post);
      } else {
        setPost(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleDelete = async () => {
    if (!window.confirm('이 게시글을 정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, 'posts', postId));
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-1">게시글을 찾을 수 없습니다</h3>
        <p className="text-gray-500 mb-4">찾으시는 게시글이 존재하지 않거나 삭제되었습니다.</p>
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> 게시판으로 돌아가기
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.uid === post.authorId;
  const isAdmin = false; // We could check this from users collection if needed, but keeping it simple for now

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          뒤로가기
        </button>
        
        {(isOwner || isAdmin) && (
          <div className="flex items-center gap-3">
            {isOwner && (
              <button 
                onClick={() => onEdit(post)}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
              >
                <Edit2 size={16} />
                수정
              </button>
            )}
            <button 
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-red-50"
            >
              <Trash2 size={16} />
              삭제
            </button>
          </div>
        )}
      </div>
      
      <div className="px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-12 h-12 rounded-full shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shadow-sm">
                {post.authorName?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <User size={16} className="text-gray-400" />
                {post.authorName}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'yyyy년 MM월 dd일 a h:mm') : '방금 전'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  조회수 {post.viewCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div 
          className="prose max-w-none text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}
