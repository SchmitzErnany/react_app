import { uniqueId } from 'lodash';
import filesize from 'filesize';

import GlobalStyle from './styles/global';
import { Container, Content } from './styles';
import api from './services/api';

import Upload from './components/Upload';
import FileList from './components/FileList';
import React, { useState, useEffect, useRef } from 'react';

export default function App() {

  const [testFiles, setTestFiles] = useState([[], []]);

  useEffect(() => {
    async function uploading() {
      const response = await api.get('/posts')

      setTestFiles([testFiles[0],
      response.data.map(file => ({
        id: file._id,
        name: file.name,
        readableSize: filesize(file.size),
        preview: file.url,
        uploaded: true,
        url: file.url,
      }))
      ])
    };
    uploading();
    return () => { testFiles[1].forEach(file => URL.revokeObjectURL(file.preview)) }
  }, []);

  const lengthDBFiles = useRef(0);

  // const uploadedLength = () => { return testFiles[1].length }
  useEffect(() => {
    // console.log('ref:', lengthDBFiles.current, ' ||| allFiles:', testFiles[1].length)
    if (testFiles[1].length > lengthDBFiles.current) {
      testFiles[0].forEach(processUpload)
      lengthDBFiles.current = testFiles[1].length
    }
    
  }, [testFiles]);


  function handleUpload(files) {
    const toUploadFiles = files.map(file => ({
      file,
      id: uniqueId(),
      name: file.name,
      readableSize: filesize(file.size),
      preview: URL.createObjectURL(file),
      progress: 0,
      uploaded: false,
      error: false,
      url: null,
    }))

    setTestFiles([toUploadFiles, testFiles[1].concat(toUploadFiles)])

  };

  function updateFile(id, data) {
    setTestFiles([testFiles[0], testFiles[1].map(uploadedFile => {
      return id === uploadedFile.id ? { ...uploadedFile, ...data } : uploadedFile;
    })])
  };

  function processUpload(uploadedFile) {
    const data = new FormData();

    data.append('file', uploadedFile.file, uploadedFile.name);

    // console.log('length of uploadedFiles:', testFiles[1].length)
    // console.log('length of newFiles:', testFiles[0].length)

    api.post('/posts', data, {
      onUploadProgress: e => {
        const progress = parseInt(Math.round((e.loaded * 100) / e.total));
        updateFile(uploadedFile.id, {
          progress,
        })
      }
    }).then((response) => {
      updateFile(uploadedFile.id, {
        uploaded: true,
        id: response.data._id,
        url: response.data.url
      })
    }).catch(() => {
      updateFile(uploadedFile.id, {
        error: true
      })
    })
  };

  async function handleDelete(id) {
    await api.delete(`posts/${id}`);
    
    setTestFiles([testFiles[0], testFiles[1].filter(file => file.id !== id)]);
    lengthDBFiles.current = testFiles[1].filter(file => file.id !== id).length
  };




  return (
    <Container>
      <Content>
        <Upload onUpload={handleUpload} />
        {!!testFiles[1].length && (
          <FileList files={testFiles[1]} onDelete={handleDelete} />
        )}

      </Content>
      <GlobalStyle />
    </Container>
  );
}
