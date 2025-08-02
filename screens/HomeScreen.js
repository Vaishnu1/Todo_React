import React, { useState, useEffect } from "react";
import SafeViewAndroid from "../components/SafeViewAndroid";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

const HomeScreen = () => {
  const [todoInput, setTodoInput] = useState("");
  const [todos, setTodos] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "todos"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todoList = [];
      snapshot.forEach((doc) => {
        todoList.push({ id: doc.id, ...doc.data() });
      });
      setTodos(todoList);
    });

    return () => unsubscribe();
  }, []);

  const addTodo = async () => {
    if (todoInput.trim() === "") return;

    try {
      await addDoc(collection(db, "todos"), {
        title: todoInput,
        completed: false,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
      });
      setTodoInput("");
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      await updateDoc(doc(db, "todos", id), {
        completed: !completed,
      });
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await deleteDoc(doc(db, "todos", id));
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const startEditTodo = (index) => {
    setTodoInput(todos[index].title);
    setEditingIndex(index);
  };

  const saveEditTodo = async (id) => {
    if (todoInput.trim() === "") return;
    try {
      await updateDoc(doc(db, "todos", id), {
        title: todoInput,
      });
      setTodoInput("");
      setEditingIndex(null);
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  const renderTodoItem = ({ item, index }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={styles.todoCheckbox}
        onPress={() => toggleTodo(item.id, item.completed)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text
        style={[styles.todoText, item.completed && styles.completedTodoText]}
      >
        {item.title}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => startEditTodo(index)}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteTodo(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, SafeViewAndroid.AndroidSafeArea]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Todos</Text>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={todoInput}
          onChangeText={setTodoInput}
          placeholder="Add a new todo..."
          placeholderTextColor="#666"
        />
        {editingIndex === null ? (
          <TouchableOpacity style={styles.addButton} onPress={addTodo}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => saveEditTodo(todos[editingIndex].id)}
          >
            <Text style={styles.addButtonText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={todos}
        renderItem={renderTodoItem}
        keyExtractor={(item) => item.id}
        style={styles.todoList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 5,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  todoList: {
    flex: 1,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#4285F4",
    borderRadius: 12,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#4285F4",
    fontSize: 16,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
  },
  completedTodoText: {
    textDecorationLine: "line-through",
    color: "#666",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
  },
  signOutButton: {
    backgroundColor: "#666",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  signOutButtonText: {
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
  },
  edit: {
    color: "blue",
    marginRight: 10,
  },
  delete: {
    color: "red",
  },
});

export default HomeScreen;
