// components/FileUploadModel.tsx
import React, { useState } from 'react';
import { Modal, Upload, Button, Form, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

// Define Props
interface FileUploadModelProps {
  visible: boolean;
  onCancel: () => void;
  onUpload: (files: {
    model_files: UploadFile[];
    log?: UploadFile;
    eval?: UploadFile;
    nerfstudio_data?: UploadFile;
    nerfstudio_model?: UploadFile;
  }) => void;
  loading: boolean;
}

// Define File List State
interface FileListState {
  model_files: UploadFile[];
  log: UploadFile | null;
  eval: UploadFile | null;
  nerfstudio_data: UploadFile | null;
  nerfstudio_model: UploadFile | null;
}

const FileUploadModel: React.FC<FileUploadModelProps> = ({
  visible,
  onCancel,
  onUpload,
  loading,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<FileListState>({
    model_files: [],
    log: null,
    eval: null,
    nerfstudio_data: null,
    nerfstudio_model: null,
  });

  const beforeUpload = (file: RcFile, field: keyof FileListState): boolean => {
    const newFileList = { ...fileList };

    if (field === 'model_files') {
      newFileList[field] = [...newFileList[field], file];
    } else {
      newFileList[field] = file;
    }

    setFileList(newFileList);
    return false; // Prevent automatic upload
  };

  const handleRemove = (file: UploadFile, field: keyof FileListState) => {
    const newFileList = { ...fileList };

    if (field === 'model_files') {
      newFileList[field] = newFileList[field].filter(f => f.uid !== file.uid);
    } else {
      newFileList[field] = null;
    }

    setFileList(newFileList);
  };

  const handleSubmit = () => {
    onUpload({
      model_files: fileList.model_files,
      log: fileList.log ?? undefined,
      eval: fileList.eval ?? undefined,
      nerfstudio_data: fileList.nerfstudio_data ?? undefined,
      nerfstudio_model: fileList.nerfstudio_model ?? undefined,
    });
  };

  const uploadProps = (field: keyof FileListState) => ({
    beforeUpload: (file: RcFile) => beforeUpload(file, field),
    onRemove: (file: UploadFile) => handleRemove(file, field),
    fileList: field === 'model_files' ? fileList[field] : fileList[field] ? [fileList[field]!] : [],
    multiple: field === 'model_files',
  });

  return (
    <Modal
      title="Upload Model Files"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          Upload
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Model Files" required>
          <Upload {...uploadProps('model_files')} listType="text">
            <Button icon={<UploadOutlined />}>Select Files</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="Log File">
          <Upload {...uploadProps('log')} listType="text">
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="Eval File">
          <Upload {...uploadProps('eval')} listType="text">
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="NerfStudio Data">
          <Upload {...uploadProps('nerfstudio_data')} listType="text">
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="NerfStudio Model">
          <Upload {...uploadProps('nerfstudio_model')} listType="text">
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FileUploadModel;
