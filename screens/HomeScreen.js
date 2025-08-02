import React, { useState, useEffect } from "react";
import SafeViewAndroid from "../components/SafeViewAndroid";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Animated,
  Switch,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate responsive sizes
const scale = SCREEN_WIDTH / 375; // Use 375 as base width
const normalize = (size) => Math.round(scale * size);

// Responsive padding calculation
const getResponsivePadding = () => {
  const basePadding = 20;
  return SCREEN_WIDTH < 350 ? 10 : basePadding;
};
import { AntDesign, Feather } from '@expo/vector-icons';
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
  // State management
  const [todoInput, setTodoInput] = useState("");
  const [todos, setTodos] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [dueDateInput, setDueDateInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [priority, setPriority] = useState("medium");
  const [orientation, setOrientation] = useState("portrait");
  const slideAnimation = new Animated.Value(0);

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.width < window.height ? 'portrait' : 'landscape');
    });

    return () => subscription?.remove();
  }, []);

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
    if (dueDateInput && !/^\d{4}-\d{2}-\d{2}$/.test(dueDateInput)) {
      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format");
      return;
    }

    try {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      await addDoc(collection(db, "todos"), {
        title: todoInput,
        completed: false,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        dueDate: dueDateInput ? new Date(dueDateInput).toISOString() : null,
        priority: priority,
      });
      
      setTodoInput("");
      setDueDateInput("");
      setPriority("medium");
      
      Animated.spring(slideAnimation, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
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

  const getFilteredTodos = () => {
    switch (filter) {
      case "active":
        return todos.filter(todo => !todo.completed);
      case "completed":
        return todos.filter(todo => todo.completed);
      case "priority":
        return todos.filter(todo => todo.priority === "high");
      default:
        return todos;
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const renderTodoItem = ({ item, index }) => (
    <Animated.View style={[styles.todoItem, { 
      backgroundColor: isDarkMode ? '#2c3e50' : '#fff',
      opacity: item.completed ? 0.8 : 1
    }]}>
      <TouchableOpacity
        style={[styles.todoCheckbox, item.completed && styles.todoCheckboxChecked]}
        onPress={() => toggleTodo(item.id, item.completed)}
      >
        {item.completed && <AntDesign name="check" size={16} color="#fff" />}
      </TouchableOpacity>
      <View style={styles.todoContent}>
        <Text style={[
          styles.todoText,
          item.completed && styles.completedTodoText,
          { color: isDarkMode ? '#fff' : '#2c3e50' }
        ]}>
          {item.title}
        </Text>
        <View style={styles.todoMeta}>
          {item.dueDate && (
            <View style={styles.tag}>
              <Feather name="calendar" size={12} color="#666" />
              <Text style={styles.tagText}>
                {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          <View style={[styles.tag, styles[`priority${item.priority}`]]}>
            <Text style={styles.tagText}>
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => startEditTodo(index)}>
          <Feather name="edit-2" size={18} color="#4285F4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => deleteTodo(item.id)}>
          <Feather name="trash-2" size={18} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, SafeViewAndroid.AndroidSafeArea]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Todos</Text>
        <View style={styles.headerRight}>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: "#e9ecef", true: "#4285F4" }}
            thumbColor={isDarkMode ? "#fff" : "#f4f3f4"}
          />
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.inputContainer, {
        transform: [{ translateY: slideAnimation }]
      }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={todoInput}
            onChangeText={setTodoInput}
            placeholder="Add a new task..."
            placeholderTextColor="#adb5bd"
            returnKeyType="next"
            autoCapitalize="sentences"
            autoCorrect={true}
          />
          <TouchableOpacity style={styles.addButton} onPress={editingIndex === null ? addTodo : () => saveEditTodo(todos[editingIndex].id)}>
            <AntDesign name={editingIndex === null ? "plus" : "check"} size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.inputOptions}>
          <TextInput
            style={styles.dateInput}
            value={dueDateInput}
            onChangeText={setDueDateInput}
            placeholder="Due Date (YYYY-MM-DD)"
            placeholderTextColor="#adb5bd"
            returnKeyType="done"
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.priorityButtons}>
            {["low", "medium", "high"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityButton, priority === p && styles.priorityButtonActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityButtonText, priority === p && styles.priorityButtonTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={styles.filterTabs}>
        {["all", "active", "completed", "priority"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredTodos()}
        renderItem={renderTodoItem}
        keyExtractor={(item) => item.id}
        style={[
          styles.todoList,
          { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }
        ]}
        contentContainerStyle={styles.todoListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: getResponsivePadding(),
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    height: 45,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 6,
    paddingHorizontal: 15,
    marginRight: 12,
    width: 140,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#495057",
  },
  todoContent: {
    flex: 1,
    marginRight: 10,
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: normalize(15),
    backgroundColor: "#f8f9fa",
    padding: normalize(12),
    borderRadius: normalize(8),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  title: {
    fontSize: normalize(22),
    fontWeight: "600",
    color: "#2c3e50",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "column",
    marginBottom: normalize(15),
    backgroundColor: "#f8f9fa",
    padding: normalize(12),
    borderRadius: normalize(8),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e9ecef",
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: normalize(45),
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: normalize(6),
    paddingHorizontal: normalize(12),
    marginRight: normalize(8),
    backgroundColor: "#fff",
    fontSize: normalize(14),
    color: "#495057",
  },
  addButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: normalize(15),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: normalize(6),
    height: normalize(45),
    minWidth: normalize(45),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  todoList: {
    flex: 1,
    marginTop: 10,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: normalize(12),
    backgroundColor: "#fff",
    borderRadius: normalize(8),
    marginBottom: normalize(8),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    flexWrap: 'nowrap',
    width: '100%',
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
    backgroundColor: "#34495e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    marginLeft: 10,
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: normalize(12),
    flexWrap: 'wrap',
    gap: normalize(8),
    justifyContent: 'center',
  },
  filterTab: {
    paddingVertical: normalize(6),
    paddingHorizontal: normalize(12),
    borderRadius: normalize(16),
    backgroundColor: '#fff',
    minWidth: normalize(80),
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4285F4',
  },
  filterTabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
  },
  priorityButtonActive: {
    backgroundColor: '#4285F4',
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  inputOptions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todoMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  prioritylow: {
    backgroundColor: '#e9ecef',
  },
  prioritymedium: {
    backgroundColor: '#fff3cd',
  },
  priorityhigh: {
    backgroundColor: '#f8d7da',
  },
  todoCheckboxChecked: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  todoListContent: {
    flexGrow: 1,
    paddingBottom: normalize(20),
  },
  // Responsive layout styles
  landscapeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  landscapeColumn: {
    flex: 1,
    marginHorizontal: normalize(8),
  },
  // Theme styles
  darkTheme: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  darkThemeText: {
    color: '#fff',
  },
  darkThemeInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#444',
  },
});

export default HomeScreen;
