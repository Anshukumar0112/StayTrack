StayTrack Firebase configuration

Files:
- firebase.json
- firestore.rules
- firestore.indexes.json

These files are based on the Firestore queries found in the uploaded StayTrack Spring Boot backend.

Important:
1. Firestore collections do not need to be manually created. They appear when the backend writes the first document.
2. Firebase Authentication remains responsible for phone OTP/authentication.
3. The Spring Boot backend uses Firebase Admin SDK, so Firestore security rules do not restrict backend/Admin SDK access.
4. firestore.rules intentionally blocks direct client Firestore access. If the Next.js frontend later needs direct Firestore access, design and add narrowly scoped rules before enabling it.
5. Deploy from this directory with Firebase CLI after linking it to the StayTrack Firebase project.
