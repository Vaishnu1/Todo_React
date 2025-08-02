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
    
    if (dueDateInput) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateInput)) {
        Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format");
        return;
      }
      
      // Validate date values
      const [year, month, day] = dueDateInput.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date < new Date(new Date().setHours(0, 0, 0, 0))
      ) {
        Alert.alert("Invalid Date", "Please enter a valid future date");
        return;
      }
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
      backgroundColor: isDarkMode ? '#333333' : '#ffffff',
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
    <View style={[
      styles.container,
      SafeViewAndroid.AndroidSafeArea,
      isDarkMode && styles.darkTheme
    ]}>
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <Text style={[styles.title, isDarkMode && styles.darkThemeText]}>My Todos</Text>
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

      <Animated.View style={[
        styles.inputContainer,
        isDarkMode && styles.darkInputContainer,
        { transform: [{ translateY: slideAnimation }] }
      ]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkThemeInput]}
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
          <View style={[styles.dateInputContainer, isDarkMode && { backgroundColor: '#2d2d2d', borderColor: '#404040' }]}>
            <Feather name="calendar" size={16} color={isDarkMode ? "#fff" : "#666"} style={styles.calendarIcon} />
            <TextInput
              style={[styles.dateInput, isDarkMode && styles.darkDateInput]}
              value={dueDateInput}
              onChangeText={(text) => {
                // Format the date as user types
                text = text.replace(/\D/g, ''); // Remove non-digits
                if (text.length > 8) text = text.slice(0, 8);
                // Add dashes as user types
                if (text.length >= 4) text = text.slice(0, 4) + '-' + text.slice(4);
                if (text.length >= 7) text = text.slice(0, 7) + '-' + text.slice(7);
                setDueDateInput(text);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#adb5bd"
              returnKeyType="done"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <View style={styles.priorityButtons}>
            {["low", "medium", "high"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  isDarkMode && styles.darkPriorityButton,
                  priority === p && styles.priorityButtonActive
                ]}
                onPress={() => setPriority(p)}
              >
                <Text style={[
                  styles.priorityButtonText,
                  isDarkMode && styles.darkPriorityButtonText,
                  priority === p && styles.priorityButtonTextActive
                ]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={[styles.filterTabs, isDarkMode && { backgroundColor: '#1a1a1a' }]}>
        {["all", "active", "completed", "priority"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              isDarkMode && styles.darkFilterTab,
              filter === f && styles.filterTabActive
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterTabText,
              isDarkMode && styles.darkFilterTabText,
              filter === f && styles.filterTabTextActive
            ]}>
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
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
  },
  inputContainer: {
    flexDirection: "column",
    marginBottom: normalize(16),
    width: '100%',
    gap: normalize(8),
    padding: SCREEN_WIDTH < 380 ? normalize(12) : normalize(16),
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    color: "#1E293B",
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: normalize(16),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: normalize(12),
    height: normalize(50),
    minWidth: normalize(50),
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: '100%',
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#2563EB",
    borderRadius: 8,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  checkmark: {
    color: "#0066ff",
    fontSize: normalize(16),
  },
  todoText: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: normalize(4),
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
    backgroundColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
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
    padding: normalize(10),
    borderRadius: normalize(12),
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginLeft: normalize(8),
  },
  filterTabs: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: normalize(8),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: normalize(8),
  },
  filterTab: {
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(12),
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    width: SCREEN_WIDTH < 380 ? '48%' : 'auto',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: normalize(4),
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1E40AF',
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
  },
  filterTabText: {
    color: '#4a5568',
    fontSize: normalize(14),
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: normalize(4),
    flexWrap: 'wrap',
    flex: SCREEN_WIDTH < 380 ? 1 : undefined,
    justifyContent: SCREEN_WIDTH < 380 ? 'space-between' : 'flex-start',
  },
  priorityButton: {
    paddingVertical: 6,
    paddingHorizontal: normalize(8),
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    minWidth: SCREEN_WIDTH < 380 ? '30%' : undefined,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#666666',
    borderColor: '#666666',
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  priorityButtonTextActive: {
    color: '#ffffff',
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
    gap: normalize(6),
    paddingVertical: normalize(6),
    paddingHorizontal: normalize(10),
    borderRadius: normalize(12),
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tagText: {
    fontSize: normalize(12),
    fontWeight: '500',
    color: '#666666',
  },
  prioritylow: {
    backgroundColor: '#E5F0EA',
    borderColor: '#047857',
  },
  prioritymedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#B45309',
  },
  priorityhigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#B91C1C',
  },
  todoCheckboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
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
  },
  darkHeader: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  darkInputContainer: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  darkThemeText: {
    color: '#fff',
  },
  darkThemeInput: {
    backgroundColor: '#333333',
    color: '#fff',
    borderColor: '#404040',
  },
  darkFilterTab: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  darkFilterTabText: {
    color: '#fff',
  },
  darkPriorityButton: {
    backgroundColor: '#333333',
    borderColor: '#404040',
  },
  darkPriorityButtonText: {
    color: '#fff',
  },
  darkDateInput: {
    backgroundColor: '#333333',
    color: '#fff',
    borderColor: '#404040',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: normalize(44),
    borderWidth: 1,
    borderColor: "#e1e4e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    width: SCREEN_WIDTH < 380 ? '100%' : '40%',
    marginBottom: SCREEN_WIDTH < 380 ? 8 : 0,
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: "#1a1a1a",
    padding: 0,
  },
  inputOptions: {
    flexDirection: 'row',
    marginTop: normalize(12),
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: normalize(12),
  },
});

export default HomeScreen;
