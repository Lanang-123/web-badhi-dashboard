// src/pages/Settings/Settings.tsx

import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, Popconfirm, Form, Card } from "antd";
import type { TableProps, TableColumnType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import styles from "./Settings.module.css";
import useReconstructionStore, { ConfigItem, NewConfigPayload } from "../../store/useReconstructionStore";

// PERBAIKAN: Definisikan tipe kolom kustom yang menyertakan 'editable'
interface EditableColumnType extends TableColumnType<ConfigItem> {
  editable?: boolean;
}

// EditableCell tidak berubah
const EditableCell: React.FC<{
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: "text";
  record: ConfigItem;
  index: number;
  children: React.ReactNode;
}> = ({ editing, dataIndex, title, inputType, record, index, children, ...restProps }) => {
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: `Please Input ${title}!` }]}
        >
          <Input />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

function Settings() {
  const [form] = Form.useForm();
  
  const { configs, fetchConfigs, addConfig, updateConfig, removeConfig } = useReconstructionStore();
  
  const [dataSource, setDataSource] = useState<ConfigItem[]>([]);
  const [editingKey, setEditingKey] = useState<string>("");

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    setDataSource(configs);
  }, [configs]);

  const isEditing = (record: ConfigItem) => record.id === editingKey;

  const edit = (record: Partial<ConfigItem> & { id: string }) => {
    form.setFieldsValue({ key: record.key || '', value: record.value || '' });
    setEditingKey(record.id);
  };

  const cancel = () => {
    if (editingKey.startsWith('temp-')) {
      setDataSource(prevData => prevData.filter(item => item.id !== editingKey));
    }
    setEditingKey("");
  };

  const save = async (record: ConfigItem) => {
    try {
      const row = (await form.validateFields()) as ConfigItem;
      
      if (record.id.startsWith('temp-')) {
        // PERBAIKAN: Payload sekarang cocok dengan tipe NewConfigPayload di store
        const payload: NewConfigPayload = { key: record.key, value: row.value };
        await addConfig(payload);
      } else {
        await updateConfig(record.key, row.value, record.id);
      }
      setEditingKey("");
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const addNewConfig = () => {
    if (editingKey) return;
    const tempId = `temp-${Date.now()}`;
    const newKey = `config_${dataSource.length + 1}`;
    
    const newItem: ConfigItem = { id: tempId, key: newKey, value: "" };
    setDataSource([newItem, ...dataSource]);
    edit(newItem);
  };
  
  // PERBAIKAN: Gunakan tipe kolom kustom 'EditableColumnType'
  const columns: EditableColumnType[] = [
    {
      title: "Key",
      dataIndex: "key",
      editable: false,
    },
    {
      title: "Name Config",
      dataIndex: "value",
      editable: true,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_: any, record: ConfigItem) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button type="link" onClick={() => save(record)}>Save</Button>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <Button type="link">Cancel</Button>
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Button type="link" disabled={editingKey !== ""} onClick={() => edit(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Are you sure to delete?"
              onConfirm={() => removeConfig(record.id)}
            >
              <Button type="link" danger disabled={editingKey !== ""}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: ConfigItem) => ({
        record,
        inputType: "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <Card title="Configuration Settings" className={styles.settingsContainer}>
      <Form form={form} component={false}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addNewConfig}
          style={{ marginBottom: 16 }}
          disabled={editingKey !== ""}
        >
          Add Config
        </Button>
        <Table
          components={{ body: { cell: EditableCell } }}
          bordered
          dataSource={dataSource}
          columns={mergedColumns as TableProps<ConfigItem>['columns']}
          rowClassName="editable-row"
          rowKey="id"
          pagination={false}
        />
      </Form>
    </Card>
  );
}

export default Settings;