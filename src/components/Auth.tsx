import React from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { LogIn, LogOut } from 'lucide-react';

export function Auth({ user }: { user: any }) {
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // Create new user profile
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || '익명',
            photoURL: user.photoURL || '',
            role: 'employee', // Default role
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    } catch (error) {
      console.error('Error signing in', error);
      alert('로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.photoURL && (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
    >
      <LogIn size={16} />
      Google로 로그인
    </button>
  );
}
