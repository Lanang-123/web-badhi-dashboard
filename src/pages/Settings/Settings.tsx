import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  Form,
  Card,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import styles from "./Settings.module.css";
import useReconstructionStore from "../../store/useReconstructionStore";

interface ConfigItem {
  key: string;
  value: string;
}

interface SettingsProps {
  onConfigsChange?: (configs: ConfigItem[]) => void;
}

// Editable cell component
const EditableCell: React.FC<{
  editing: boolean;
  dataIndex: string;
  title: string;
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

function Settings({ onConfigsChange }: SettingsProps) {
  const [form] = Form.useForm();
  const configs = useReconstructionStore((state) => state.configs);
  const addConfig = useReconstructionStore((state) => state.addConfig);
  const updateConfig = useReconstructionStore((state) => state.updateConfig);
  const removeConfig = useReconstructionStore((state) => state.removeConfig);
  const [editingKey, setEditingKey] = useState<string>("");

  useEffect(() => {
    onConfigsChange?.(configs);
  }, [configs, onConfigsChange]);

  const isEditing = (record: ConfigItem) => record.key === editingKey;

  const edit = (record: ConfigItem) => {
    form.setFieldsValue({ key: record.key, value: record.value });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key: string) => {
    try {
      const row = (await form.validateFields()) as ConfigItem;
      updateConfig(key, row.value);
      setEditingKey("");
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const addNewConfig = () => {
    const newKey = `config_${Date.now()}`;
    addConfig({ key: newKey, value: "" });
    setEditingKey(newKey);
    form.setFieldsValue({ key: newKey, value: "" });
  };

  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      editable: false,
    },
    {
      title: "Value",
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
            <Button type="link" onClick={() => save(record.key)}>
              Save
            </Button>
            <Button type="link" onClick={cancel}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Button type="link" disabled={editingKey !== ""} onClick={() => edit(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Are you sure to delete?"
              onConfirm={() => removeConfig(record.key)}
            >
              <Button type="link" danger>
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
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={configs}
          columns={mergedColumns as any}
          rowClassName="editable-row"
          rowKey="key"
          pagination={false}
        />
      </Form>
    </Card>
  );
}

export default Settings;
export type { ConfigItem };
